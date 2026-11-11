import { FormEvent, useEffect, useId, useRef } from 'react'
import { useLocale } from '../../i18n/LocaleContext'

interface Props {
  initialTitle: string
  onCancel: () => void
  onConfirm: (title: string) => void
}

export function ChatRenameDialog({ initialTitle, onCancel, onConfirm }: Props) {
  const { t } = useLocale()
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = inputRef.current?.value.trim() ?? ''
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <div className="chat-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="chat-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="chat-dialog-title">
          {t('chatRenamePrompt')}
        </h3>
        <form onSubmit={onSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="chat-dialog-input"
            defaultValue={initialTitle}
            maxLength={120}
            autoComplete="off"
          />
          <div className="chat-dialog-actions">
            <button type="button" className="btn-ghost" onClick={onCancel}>
              {t('cancel')}
            </button>
            <button type="submit" className="btn-primary">
              {t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
