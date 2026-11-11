import { useEffect, useRef, useState, type MouseEvent } from 'react'
import type { ChatSessionSummary } from '@shared/ai'
import { useLocale } from '../../i18n/LocaleContext'
import { ChatRenameDialog } from './ChatRenameDialog'

interface Props {
  open: boolean
  sessions: ChatSessionSummary[]
  activeId: string | null
  onToggle: () => void
  onNew: () => void
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

function formatWhen(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

export function ChatSessionSidebar({
  open,
  sessions,
  activeId,
  onToggle,
  onNew,
  onSelect,
  onRename,
  onDelete
}: Props) {
  const { locale, t } = useLocale()
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ctxMenu) return
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setCtxMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [ctxMenu])

  function openContextMenu(e: MouseEvent, id: string) {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ id, x: e.clientX, y: e.clientY })
  }

  function startRename(id: string) {
    setCtxMenu(null)
    const current = sessions.find((s) => s.id === id)
    setRenameTarget({
      id,
      title: current?.title?.trim() || t('chatDefaultTitle')
    })
  }

  function requestDelete(id: string) {
    setCtxMenu(null)
    onDelete(id)
  }

  if (!open) {
    return (
      <aside className="chat-sessions chat-sessions-collapsed" aria-label={t('chatSessions')}>
        <button type="button" className="btn-ghost chat-sessions-expand" onClick={onToggle}>
          {t('chatExpandSidebar')}
        </button>
      </aside>
    )
  }

  return (
    <aside className="chat-sessions" aria-label={t('chatSessions')}>
      <div className="chat-sessions-head">
        <span className="chat-sessions-title">{t('chatSessions')}</span>
        <button type="button" className="btn-ghost btn-icon" onClick={onToggle} title={t('chatCollapseSidebar')}>
          »
        </button>
      </div>
      <button type="button" className="btn-primary chat-sessions-new" onClick={() => void onNew()}>
        {t('chatNewConversation')}
      </button>
      <ul className="chat-sessions-list">
        {sessions.map((s) => {
          const displayTitle = s.title?.trim() || t('chatDefaultTitle')
          return (
          <li key={s.id}>
            <div
              className={`chat-session-card${s.id === activeId ? ' active' : ''}`}
              onContextMenu={(e) => openContextMenu(e, s.id)}
            >
              <div className="chat-session-card-head">
                <button
                  type="button"
                  className="chat-session-select"
                  onClick={() => void onSelect(s.id)}
                >
                  <span className="chat-session-item-label">{displayTitle}</span>
                </button>
                <button
                  type="button"
                  className="btn-ghost chat-session-delete"
                  title={t('chatDeleteSession')}
                  aria-label={t('chatDeleteSession')}
                  onClick={(e) => {
                    e.stopPropagation()
                    requestDelete(s.id)
                  }}
                >
                  ×
                </button>
              </div>
              <div className="chat-session-meta-panel" role="tooltip" aria-label={t('chatSessionMetaLabel')}>
                <div className="chat-session-meta-panel-inner">
                  <span>
                    {t('chatSessionCreated')}: {formatWhen(s.createdAt, locale)}
                  </span>
                  <span>
                    {t('chatSessionUpdated')}: {formatWhen(s.updatedAt, locale)}
                  </span>
                  <span>
                    {t('chatSessionTokens')}: {s.totalTokens.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </li>
          )
        })}
      </ul>

      {ctxMenu ? (
        <div
          ref={menuRef}
          className="chat-session-context-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          role="menu"
        >
          <button type="button" role="menuitem" onClick={() => startRename(ctxMenu.id)}>
            {t('chatContextRename')}
          </button>
          <button type="button" role="menuitem" className="danger" onClick={() => requestDelete(ctxMenu.id)}>
            {t('chatContextDelete')}
          </button>
        </div>
      ) : null}

      {renameTarget ? (
        <ChatRenameDialog
          initialTitle={renameTarget.title}
          onCancel={() => setRenameTarget(null)}
          onConfirm={(title) => {
            onRename(renameTarget.id, title)
            setRenameTarget(null)
          }}
        />
      ) : null}
    </aside>
  )
}
