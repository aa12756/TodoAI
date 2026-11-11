import { FormEvent, useEffect, useRef, useState } from 'react'
import { ChatConfirmDialog } from '../components/chat/ChatConfirmDialog'
import { ChatMarkdown } from '../components/chat/ChatMarkdown'
import { ChatSessionSidebar } from '../components/chat/ChatSessionSidebar'
import { useChat } from '../context/ChatContext'
import { useLocale } from '../i18n/LocaleContext'
import { appendThinking } from '../utils/chatThinking'

function newId(): string {
  return crypto.randomUUID()
}

function scrollLogToBottom(el: HTMLElement | null, behavior: ScrollBehavior) {
  if (!el) return
  el.scrollTo({ top: el.scrollHeight, behavior })
}

export function ChatPage({ isActive }: { isActive: boolean }) {
  const { t, localizeError } = useLocale()
  const {
    ready,
    sessions,
    activeSessionId,
    messages,
    setMessages,
    trimForApi,
    resetCurrentSession,
    recordTokenUsage,
    sidebarOpen,
    setSidebarOpen,
    selectSession,
    createSession,
    deleteSession,
    renameSession,
    scrollNonce
  } = useChat()
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingClear, setPendingClear] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  function focusComposer() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => inputRef.current?.focus())
    })
  }

  useEffect(() => {
    if (!isActive) return
    const behavior: ScrollBehavior = sending ? 'smooth' : 'auto'
    const tick = () => scrollLogToBottom(logRef.current, behavior)
    tick()
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(raf)
  }, [isActive, messages, sending, activeSessionId, scrollNonce])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending || !ready) return

    setInput('')
    setError(null)

    const userMsg = { id: newId(), role: 'user' as const, content: text }
    const assistantId = newId()
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: 'assistant', content: '', streaming: true, liveThinking: '' }
    ])
    setSending(true)

    const historyForApi = [...trimForApi(), userMsg]

    let thinkingAcc = ''
    let contentAcc = ''

    try {
      await window.todoApi.ai.chatStream(historyForApi, {
        onThinking: (chunk) => {
          thinkingAcc = appendThinking(thinkingAcc, chunk)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, liveThinking: thinkingAcc } : m
            )
          )
        },
        onDelta: (chunk) => {
          contentAcc += chunk
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: contentAcc } : m))
          )
        },
        onDone: (_tasksChanged, totalTokens) => {
          if (totalTokens) recordTokenUsage(totalTokens)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: contentAcc || m.content,
                    thinking: thinkingAcc.trim() ? thinkingAcc.trim() : undefined,
                    streaming: false,
                    liveThinking: undefined
                  }
                : m
            )
          )
        },
        onError: (message, code) => {
          const codeMsg =
            code === 'NO_API_KEY'
              ? t('errNoApiKey')
              : code === 'NETWORK'
                ? t('errAiNetwork')
                : localizeError(message)
          setError(codeMsg)
          setMessages((prev) => prev.filter((m) => m.id !== assistantId))
        }
      })
    } catch {
      /* onError handled */
    } finally {
      setSending(false)
    }
  }

  async function confirmClear() {
    setPendingClear(false)
    await resetCurrentSession()
    setError(null)
    setInput('')
    focusComposer()
  }

  const showBubble = (m: (typeof messages)[number]) =>
    !(m.streaming && !m.content && !(m.liveThinking && m.liveThinking.length > 0))

  return (
    <section className="panel chat-panel">
      <header className="chat-toolbar">
        <div className="chat-toolbar-text">
          <h2 className="chat-toolbar-title">{t('chatTitle')}</h2>
          <p className="chat-toolbar-hint">{t('chatHint')}</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => setPendingClear(true)}
          disabled={!ready}
        >
          {t('chatClear')}
        </button>
      </header>

      <div className="chat-layout">
        <ChatSessionSidebar
          open={sidebarOpen}
          sessions={sessions}
          activeId={activeSessionId}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          onNew={() => void createSession()}
          onSelect={(id) => void selectSession(id)}
          onRename={(id, title) => void renameSession(id, title)}
          onDelete={(id) => setPendingDeleteId(id)}
        />

        <div className="chat-main">
          <div ref={logRef} className="chat-log" role="log" aria-live="polite">
            {!ready ? <p className="chat-typing">{t('chatLoading')}</p> : null}
            {messages.filter(showBubble).map((m) => {
              const thinkingText = m.streaming ? m.liveThinking : m.thinking
              return (
                <div key={m.id} className={`chat-bubble chat-${m.role}`}>
                  <span className="chat-role">{m.role === 'user' ? t('chatYou') : t('chatAssistant')}</span>

                  {m.role === 'assistant' && thinkingText ? (
                    <details className="chat-thinking" open={Boolean(m.streaming)}>
                      <summary>{t('chatThinkingPanel')}</summary>
                      <pre className="chat-thinking-body">{thinkingText}</pre>
                    </details>
                  ) : null}

                  {m.role === 'user' ? (
                    <div className="chat-content">{m.content}</div>
                  ) : m.content ? (
                    <ChatMarkdown content={m.content} />
                  ) : m.streaming ? (
                    <div className="chat-content chat-typing">{t('chatThinking')}</div>
                  ) : null}

                  {m.streaming && m.content ? <span className="chat-cursor" aria-hidden /> : null}
                </div>
              )
            })}
            <div className="chat-log-end" aria-hidden />
          </div>

          <div className="chat-compose">
            {error && <p className="banner-error chat-compose-error">{error}</p>}
            <form className="chat-form" onSubmit={(e) => void onSubmit(e)}>
              <textarea
                ref={inputRef}
                rows={2}
                value={input}
                placeholder={t('chatPlaceholder')}
                disabled={sending || !ready}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    e.currentTarget.form?.requestSubmit()
                  }
                }}
              />
              <button type="submit" className="btn-primary" disabled={sending || !ready || !input.trim()}>
                {t('chatSend')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {pendingClear ? (
        <ChatConfirmDialog
          title={t('chatClear')}
          message={t('chatClearConfirm')}
          confirmLabel={t('chatClear')}
          onCancel={() => {
            setPendingClear(false)
            focusComposer()
          }}
          onConfirm={() => void confirmClear()}
        />
      ) : null}

      {pendingDeleteId ? (
        <ChatConfirmDialog
          title={t('chatDeleteSession')}
          message={t('chatDeleteConfirm')}
          confirmLabel={t('chatContextDelete')}
          danger
          onCancel={() => {
            setPendingDeleteId(null)
            focusComposer()
          }}
          onConfirm={() => {
            const id = pendingDeleteId
            setPendingDeleteId(null)
            void deleteSession(id)
            focusComposer()
          }}
        />
      ) : null}
    </section>
  )
}
