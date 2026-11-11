import type { TaskFilter } from '@shared/types'
import { useLocale } from '../../i18n/LocaleContext'

const FILTER_KEYS: TaskFilter[] = [
  'all',
  'today',
  'this_week',
  'next_week',
  'this_month',
  'overdue',
  'done'
]

interface Props {
  filter: TaskFilter
  count: number
  onFilterChange: (filter: TaskFilter) => void
  onRefresh: () => void
}

export function TaskFilterBar({ filter, count, onFilterChange, onRefresh }: Props) {
  const { t, filterLabel } = useLocale()

  return (
    <div className="toolbar">
      {FILTER_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={filter === key ? 'active' : ''}
          onClick={() => onFilterChange(key)}
        >
          {filterLabel(key)}
        </button>
      ))}
      <span className="toolbar-count">{t('taskCount', { count })}</span>
      <button type="button" className="toolbar-refresh" onClick={onRefresh}>
        {t('refresh')}
      </button>
    </div>
  )
}
