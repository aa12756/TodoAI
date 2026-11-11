import { useEffect, useState } from 'react'
import type { TaskFilter } from '@shared/types'
import { SchedulePlanPanel } from '../components/tasks/SchedulePlanPanel'
import { TaskCreateForm } from '../components/tasks/TaskCreateForm'
import { TaskFilterBar } from '../components/tasks/TaskFilterBar'
import { TaskList } from '../components/tasks/TaskList'
import { useTasks } from '../hooks/useTasks'
import { useLocale } from '../i18n/LocaleContext'

interface TasksPageProps {
  focusTaskId?: string | null
  onFocusDone?: () => void
}

export function TasksPage({ focusTaskId, onFocusDone }: TasksPageProps) {
  const { t } = useLocale()
  const [filter, setFilter] = useState<TaskFilter>('all')
  const { tasks, loading, error, refresh, create, update, complete, remove, clearError } =
    useTasks(filter)

  useEffect(() => {
    return window.todoApi.events.onTasksChanged(() => void refresh())
  }, [refresh])

  return (
    <>
      <div className="tasks-toolbar-row">
        <TaskFilterBar
          filter={filter}
          count={tasks.length}
          onFilterChange={(next) => {
            clearError()
            setFilter(next)
          }}
          onRefresh={() => void refresh()}
        />
      </div>
      <SchedulePlanPanel onApplied={() => void refresh()} />

      {filter !== 'done' && <TaskCreateForm onCreate={create} />}

      <section className="panel">
        <h2 className="section-title">{t('sectionList')}</h2>
        {error && (
          <div className="banner-error" role="alert">
            {error}
            <button type="button" className="btn-link" onClick={clearError}>
              ×
            </button>
          </div>
        )}
        <TaskList
          tasks={tasks}
          loading={loading}
          focusTaskId={focusTaskId}
          onFocusDone={onFocusDone}
          onComplete={complete}
          onUpdate={update}
          onDelete={remove}
        />
      </section>
    </>
  )
}
