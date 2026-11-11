import { useEffect, useId, useRef } from 'react'
import { useLocale } from '../../i18n/LocaleContext'

interface Props {
  title: string
  message: string
  confirmLabel: string
  danger?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function ChatConfirmDialog({
  title,
  message,
  confirmLabel,
  danger,
  onCancel,
  onConfirm
}: Props) {
  const { t } = useLocale()
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div className="chat-dialog-backdrop" role="presentation" onClick={onCancel}>
      <div
        className="chat-dialog chat-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="chat-dialog-title">
          {title}
        </h3>
        <p className="chat-confirm-message">{message}</p>
        <div className="chat-dialog-actions">
          <button ref={cancelRef} type="button" className="btn-ghost" onClick={onCancel}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={danger ? 'btn-primary btn-danger' : 'btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
