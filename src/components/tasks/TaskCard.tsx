import { forwardRef, useState } from 'react'
import type { Task } from '@shared/types'
import type { UpdateTaskInput } from '@shared/types'
import { useLocale } from '../../i18n/LocaleContext'
import { isOverdue } from '../../utils/datetime'
import { TaskEditForm } from './TaskEditForm'

interface Props {
  task: Task
  highlighted?: boolean
  onComplete: (id: string) => Promise<boolean>
  onUpdate: (id: string, input: UpdateTaskInput) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export const TaskCard = forwardRef<HTMLLIElement, Props>(function TaskCard(
  { task, highlighted, onComplete, onUpdate, onDelete },
  ref
) {
  const { t, priorityLabel, priorityShort, statusLabel, locale } = useLocale()
  const [editing, setEditing] = useState(false)
  const overdue = isOverdue(task)

  const formatDue = (iso: string | null): string => {
    if (!iso) return t('noDue')
    try {
      return new Date(iso).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
    } catch {
      return iso
    }
  }

  async function handleDelete() {
    if (!window.confirm(t('confirmDelete'))) return
    await onDelete(task.id)
  }

  async function handleReopen() {
    await onUpdate(task.id, { status: 'open' })
  }

  const priorityClass = `priority-${task.priority}`

  return (
    <li
      ref={ref}
      data-task-id={task.id}
      className={[
        'task-item',
        task.status === 'done' ? 'done' : '',
        overdue ? 'overdue' : '',
        highlighted ? 'highlighted' : ''
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {editing ? (
        <TaskEditForm task={task} onSave={onUpdate} onCancel={() => setEditing(false)} />
      ) : (
        <>
          <div className="task-body">
            <div className="task-head">
              <span className={`badge ${priorityClass}`}>{priorityShort(task.priority)}</span>
              <div className="task-title">{task.title}</div>
              {overdue && <span className="badge badge-danger">{t('overdueBadge')}</span>}
            </div>
            {task.note ? <p className="task-note">{task.note}</p> : null}
            <div className="task-meta">
              {priorityLabel(task.priority)} · {formatDue(task.due_at)} ·{' '}
              {statusLabel(task.status)}
            </div>
          </div>
          <div className="task-actions">
            <button type="button" onClick={() => setEditing(true)}>
              {t('edit')}
            </button>
            {task.status === 'open' ? (
              <button type="button" onClick={() => void onComplete(task.id)}>
                {t('complete')}
              </button>
            ) : (
              <button type="button" onClick={() => void handleReopen()}>
                {t('reopen')}
              </button>
            )}
            <button type="button" className="danger" onClick={() => void handleDelete()}>
              {t('delete')}
            </button>
          </div>
        </>
      )}
    </li>
  )
})
