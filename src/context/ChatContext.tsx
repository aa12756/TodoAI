import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import {
  CHAT_STORAGE_KEY,
  type ChatSession,
  type ChatSessionSummary,
  type UiChatMessage
} from '@shared/ai'
import { useLocale } from '../i18n/LocaleContext'

export interface ChatUiMessage extends UiChatMessage {
  streaming?: boolean
  liveThinking?: string
}

interface ChatContextValue {
  ready: boolean
  sessions: ChatSessionSummary[]
  activeSessionId: string | null
  messages: ChatUiMessage[]
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  setMessages: React.Dispatch<React.SetStateAction<ChatUiMessage[]>>
  trimForApi: () => UiChatMessage[]
  selectSession: (id: string) => Promise<void>
  createSession: () => Promise<void>
  deleteSession: (id: string) => Promise<void>
  renameSession: (id: string, title: string) => Promise<void>
  resetCurrentSession: () => Promise<void>
  recordTokenUsage: (tokens: number) => void
  flushSave: () => Promise<void>
  enterChatTab: () => Promise<void>
  scrollNonce: number
}

const ChatContext = createContext<ChatContextValue | null>(null)

function toUiMessages(stored: UiChatMessage[]): ChatUiMessage[] {
  return stored.map((m) => ({ ...m, streaming: false, liveThinking: undefined }))
}

function messagesForSave(messages: ChatUiMessage[]): UiChatMessage[] {
  return messages
    .filter((m) => !m.streaming)
    .map(({ id, role, content, thinking }) => ({ id, role, content, thinking }))
}

function messagesSnapshot(messages: UiChatMessage[]): string {
  return JSON.stringify(
    messages
      .filter((m) => m.content.trim() || m.thinking?.trim())
      .map(({ id, role, content, thinking }) => ({ id, role, content, thinking }))
  )
}

function titleFromMessages(messages: UiChatMessage[], fallback: string): string {
  const user = messages.find((m) => m.role === 'user' && m.content.trim())
  if (!user) return fallback
  const t = user.content.trim().replace(/\s+/g, ' ')
  return t.length > 40 ? `${t.slice(0, 40)}…` : t
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale()
  const welcome = t('chatWelcome')
  const defaultTitle = t('chatDefaultTitle')

  const [ready, setReady] = useState(false)
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatUiMessage[]>([
    { id: 'welcome', role: 'assistant', content: welcome }
  ])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [scrollNonce, setScrollNonce] = useState(0)
  const pendingTokens = useRef(0)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const bumpScroll = useCallback(() => {
    setScrollNonce((n) => n + 1)
  }, [])

  const welcomeMessage = useCallback((): UiChatMessage => {
    return { id: 'welcome', role: 'assistant', content: welcome }
  }, [welcome])

  const applyActiveSession = useCallback((session: ChatSession) => {
    setActiveSessionId(session.id)
    const ui = toUiMessages(session.messages)
    if (ui.length === 0) {
      setMessages([welcomeMessage()])
    } else {
      setMessages(ui)
    }
  }, [welcomeMessage])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      let legacy: string | null = null
      try {
        legacy = sessionStorage.getItem(CHAT_STORAGE_KEY)
      } catch {
        /* ignore */
      }
      const boot = await window.todoApi.chat.bootstrap(legacy)
      if (cancelled) return
      if (legacy) {
        try {
          sessionStorage.removeItem(CHAT_STORAGE_KEY)
        } catch {
          /* ignore */
        }
      }
      setSessions(boot.sessions)
      applyActiveSession(boot.active)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [applyActiveSession])

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id === 'welcome') {
        return [{ ...prev[0], content: welcome }]
      }
      return prev
    })
  }, [welcome])

  const flushSave = useCallback(async () => {
    if (!activeSessionId || !ready) return
    if (messages.some((m) => m.streaming)) return

    const toSave = messagesForSave(messages)
    const existing = await window.todoApi.chat.get(activeSessionId)
    let title: string | undefined
    if (existing && !existing.titleCustom && toSave.some((m) => m.role === 'user')) {
      title = titleFromMessages(toSave, defaultTitle)
    }
    const addTokens = pendingTokens.current
    const payload = messagesSnapshot(toSave)
    const existingPayload = messagesSnapshot(existing?.messages ?? [])
    const titleWillChange = Boolean(title && title !== existing?.title)
    const hasConversationChange = payload !== existingPayload || addTokens > 0
    if (!hasConversationChange && !titleWillChange) {
      pendingTokens.current = addTokens
      return
    }

    pendingTokens.current = 0

    const saved = await window.todoApi.chat.save({
      id: activeSessionId,
      messages: toSave,
      title: titleWillChange ? title : undefined,
      addTokens: addTokens > 0 ? addTokens : undefined
    })
    if (saved) {
      const list = await window.todoApi.chat.list()
      setSessions(list)
    }
  }, [activeSessionId, defaultTitle, messages, ready])

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      void flushSave()
    }, 450)
  }, [flushSave])

  useEffect(() => {
    if (!ready || !activeSessionId) return
    if (messages.some((m) => m.streaming)) return
    scheduleSave()
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [messages, activeSessionId, ready, scheduleSave])

  const selectSession = useCallback(
    async (id: string) => {
      if (id === activeSessionId) {
        bumpScroll()
        return
      }
      await flushSave()
      await window.todoApi.chat.setActive(id)
      const session = await window.todoApi.chat.get(id)
      if (session) applyActiveSession(session)
      const list = await window.todoApi.chat.list()
      setSessions(list)
      bumpScroll()
    },
    [activeSessionId, applyActiveSession, flushSave, bumpScroll]
  )

  const enterChatTab = useCallback(async () => {
    if (!ready) return
    if (messages.some((m) => m.streaming)) return
    await flushSave()
    const list = await window.todoApi.chat.list()
    setSessions(list)
    bumpScroll()
  }, [bumpScroll, flushSave, messages, ready])

  const createSession = useCallback(async () => {
    await flushSave()
    const session = await window.todoApi.chat.create(defaultTitle)
    applyActiveSession(session)
    const list = await window.todoApi.chat.list()
    setSessions(list)
    bumpScroll()
  }, [applyActiveSession, defaultTitle, flushSave, bumpScroll])

  const deleteSession = useCallback(
    async (id: string) => {
      const result = await window.todoApi.chat.delete(id)
      if (!result.ok) return
      const list = await window.todoApi.chat.list()
      setSessions(list)
      if (id === activeSessionId) {
        if (list.length > 0) {
          const session = await window.todoApi.chat.get(list[0].id)
          if (session) {
            applyActiveSession(session)
            bumpScroll()
          }
        } else {
          const created = await window.todoApi.chat.create(defaultTitle)
          applyActiveSession(created)
          const refreshed = await window.todoApi.chat.list()
          setSessions(refreshed)
          bumpScroll()
        }
      }
    },
    [activeSessionId, applyActiveSession, defaultTitle, bumpScroll]
  )

  const renameSession = useCallback(async (id: string, title: string) => {
    const trimmed = title.trim()
    if (!trimmed) return
    const session = await window.todoApi.chat.get(id)
    if (!session) return
    await window.todoApi.chat.save({
      id,
      messages: session.messages,
      title: trimmed,
      titleCustom: true
    })
    const list = await window.todoApi.chat.list()
    setSessions(list)
  }, [])

  const resetCurrentSession = useCallback(async () => {
    if (!activeSessionId) return
    const next = [welcomeMessage()]
    setMessages(next)
    pendingTokens.current = 0
    await window.todoApi.chat.save({
      id: activeSessionId,
      messages: next,
      title: defaultTitle,
      titleCustom: false
    })
    const list = await window.todoApi.chat.list()
    setSessions(list)
  }, [activeSessionId, defaultTitle, welcomeMessage])

  const recordTokenUsage = useCallback(
    (tokens: number) => {
      if (!tokens || tokens <= 0) return
      pendingTokens.current += tokens
      if (activeSessionId) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeSessionId ? { ...s, totalTokens: s.totalTokens + tokens } : s
          )
        )
      }
      scheduleSave()
    },
    [activeSessionId, scheduleSave]
  )

  const trimForApi = useCallback((): UiChatMessage[] => {
    return messages
      .filter((m) => !m.streaming && m.content.trim())
      .filter((m) => !(m.id === 'welcome' && m.role === 'assistant'))
      .map(({ id, role, content, thinking }) => ({ id, role, content, thinking }))
      .slice(-40)
  }, [messages])

  const value = useMemo(
    () => ({
      ready,
      sessions,
      activeSessionId,
      messages,
      sidebarOpen,
      setSidebarOpen,
      setMessages,
      trimForApi,
      selectSession,
      createSession,
      deleteSession,
      renameSession,
      resetCurrentSession,
      recordTokenUsage,
      flushSave,
      enterChatTab,
      scrollNonce
    }),
    [
      ready,
      sessions,
      activeSessionId,
      messages,
      sidebarOpen,
      trimForApi,
      selectSession,
      createSession,
      deleteSession,
      renameSession,
      resetCurrentSession,
      recordTokenUsage,
      flushSave,
      enterChatTab,
      scrollNonce
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
