import type { Task, UpdateTaskInput } from '@shared/types'
import { useEffect, useRef } from 'react'
import { useLocale } from '../../i18n/LocaleContext'
import { TaskCard } from './TaskCard'

interface Props {
  tasks: Task[]
  loading: boolean
  focusTaskId?: string | null
  onFocusDone?: () => void
  onComplete: (id: string) => Promise<boolean>
  onUpdate: (id: string, input: UpdateTaskInput) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

export function TaskList({
  tasks,
  loading,
  focusTaskId,
  onFocusDone,
  onComplete,
  onUpdate,
  onDelete
}: Props) {
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  useEffect(() => {
    if (!focusTaskId || loading) return
    const el = itemRefs.current.get(focusTaskId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('task-focus-flash')
      const t = window.setTimeout(() => {
        el.classList.remove('task-focus-flash')
        onFocusDone?.()
      }, 2400)
      return () => window.clearTimeout(t)
    }
    onFocusDone?.()
  }, [focusTaskId, loading, tasks, onFocusDone])
  const { t } = useLocale()

  if (loading) {
    return <p className="empty">{t('loading')}</p>
  }

  if (tasks.length === 0) {
    return <p className="empty">{t('emptyList')}</p>
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          ref={(node) => {
            if (node) itemRefs.current.set(task.id, node)
            else itemRefs.current.delete(task.id)
          }}
          task={task}
          highlighted={focusTaskId === task.id}
          onComplete={onComplete}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}
