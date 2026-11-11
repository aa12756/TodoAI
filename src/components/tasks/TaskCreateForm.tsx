import { FormEvent, useState } from 'react'
import type { TaskPriority } from '@shared/types'
import { useLocale } from '../../i18n/LocaleContext'
import { datetimeLocalToIso } from '../../utils/datetime'
import type { CreateTaskInput } from '@shared/types'

interface Props {
  onCreate: (input: CreateTaskInput) => Promise<boolean>
}

export function TaskCreateForm({ onCreate }: Props) {
  const { t } = useLocale()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [dueLocal, setDueLocal] = useState('')
  const [priority, setPriority] = useState<TaskPriority>(1)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    const ok = await onCreate({
      title: trimmed,
      note: note.trim() || undefined,
      due_at: datetimeLocalToIso(dueLocal),
      priority
    })
    setSubmitting(false)
    if (ok) {
      setTitle('')
      setNote('')
      setDueLocal('')
      setPriority(1)
    }
  }

  return (
    <section className="panel">
      <h2 className="section-title">{t('sectionCreate')}</h2>
      <form className="form-grid" onSubmit={(e) => void handleSubmit(e)}>
        <label className="field">
          <span>{t('fieldTitle')}</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('newTaskPlaceholder')}
          />
        </label>
        <label className="field">
          <span>{t('fieldNote')}</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('notePlaceholder')}
          />
        </label>
        <div className="field-row">
          <label className="field">
            <span>
              {t('fieldDue')} <em className="hint">({t('dueOptional')})</em>
            </span>
            <input
              type="datetime-local"
              value={dueLocal}
              onChange={(e) => setDueLocal(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t('fieldPriority')}</span>
            <select
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) as TaskPriority)}
            >
              <option value={0}>{t('priorityLow')}</option>
              <option value={1}>{t('priorityMid')}</option>
              <option value={2}>{t('priorityHigh')}</option>
            </select>
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {t('addTask')}
        </button>
      </form>
    </section>
  )
}
