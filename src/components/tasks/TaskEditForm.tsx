import { FormEvent, useState } from 'react'
import type { Task, TaskPriority, UpdateTaskInput } from '@shared/types'
import { useLocale } from '../../i18n/LocaleContext'
import { datetimeLocalToIso, isoToDatetimeLocal } from '../../utils/datetime'

interface Props {
  task: Task
  onSave: (id: string, input: UpdateTaskInput) => Promise<boolean>
  onCancel: () => void
}

export function TaskEditForm({ task, onSave, onCancel }: Props) {
  const { t } = useLocale()
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [dueLocal, setDueLocal] = useState(isoToDatetimeLocal(task.due_at))
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    const ok = await onSave(task.id, {
      title: title.trim(),
      note: note.trim(),
      due_at: datetimeLocalToIso(dueLocal),
      priority
    })
    setSaving(false)
    if (ok) onCancel()
  }

  return (
    <form className="task-edit" onSubmit={(e) => void handleSubmit(e)}>
      <label className="field">
        <span>{t('fieldTitle')}</span>
        <input required value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="field">
        <span>{t('fieldNote')}</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <div className="field-row">
        <label className="field field-grow">
          <span>{t('fieldDue')}</span>
          <input
            type="datetime-local"
            value={dueLocal}
            onChange={(e) => setDueLocal(e.target.value)}
          />
        </label>
        <button type="button" className="btn-link" onClick={() => setDueLocal('')}>
          {t('clearDue')}
        </button>
      </div>
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
      <div className="task-edit-actions">
        <button type="submit" className="btn-primary" disabled={saving}>
          {t('save')}
        </button>
        <button type="button" onClick={onCancel}>
          {t('cancel')}
        </button>
      </div>
    </form>
  )
}
