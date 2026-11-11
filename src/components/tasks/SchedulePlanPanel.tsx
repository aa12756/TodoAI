import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ProposedTaskChange, ScheduleSuggestion } from '@shared/schedule'
import type { Task, TaskPriority, TaskStatus } from '@shared/types'
import { useLocale } from '../../i18n/LocaleContext'

interface Props {
  onApplied: () => void
}

function formatDue(iso: string | null | undefined, locale: string): string {
  if (iso === null) return locale === 'zh' ? '无截止' : 'No due'
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return iso
  }
}

function changeSummary(
  change: ProposedTaskChange,
  locale: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
  priorityLabel: (p: TaskPriority) => string,
  statusLabel: (s: TaskStatus) => string
): string {
  const parts: string[] = []
  if (change.due_at !== undefined) {
    parts.push(t('scheduleChangeDue', { value: formatDue(change.due_at, locale) }))
  }
  if (change.priority !== undefined) {
    parts.push(t('scheduleChangePriority', { value: priorityLabel(change.priority) }))
  }
  if (change.status !== undefined) {
    parts.push(t('scheduleChangeStatus', { value: statusLabel(change.status) }))
  }
  if (change.title !== undefined) {
    parts.push(t('scheduleChangeTitle', { value: change.title }))
  }
  if (change.note !== undefined) {
    parts.push(t('scheduleChangeNote'))
  }
  return parts.join(' · ') || '—'
}

export function SchedulePlanPanel({ onApplied }: Props) {
  const { t, locale, priorityLabel, statusLabel, localizeError } = useLocale()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<ScheduleSuggestion | null>(null)
  const [lookupTasks, setLookupTasks] = useState<Task[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [restored, setRestored] = useState(false)

  const taskById = useMemo(() => new Map(lookupTasks.map((task) => [task.id, task])), [lookupTasks])

  const persistState = useCallback(
    (sug: ScheduleSuggestion, ids: Set<string>) => {
      void window.todoApi.schedule.saveState(sug, [...ids])
    },
    []
  )

  async function loadTaskLookup() {
    const all = await window.todoApi.tasks.list('all')
    setLookupTasks(all)
  }

  function applyStored(
    sug: ScheduleSuggestion,
    selectedIds: string[],
    expand = true
  ) {
    setSuggestion(sug)
    setSelected(new Set(selectedIds))
    if (expand) setOpen(true)
  }

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const stored = await window.todoApi.schedule.getLast()
      if (cancelled || !stored) {
        setRestored(true)
        return
      }
      applyStored(stored.suggestion, stored.selectedIds, true)
      await loadTaskLookup()
      setRestored(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!suggestion || !restored) return
    persistState(suggestion, selected)
  }, [suggestion, selected, persistState, restored])

  async function onSuggest() {
    setOpen(true)
    setLoading(true)
    setError(null)
    setToast(null)
    const result = await window.todoApi.ai.suggestSchedule()
    setLoading(false)
    if (!result.ok) {
      const codeMsg =
        result.code === 'NO_API_KEY'
          ? t('errNoApiKey')
          : result.code === 'NETWORK'
            ? t('errAiNetwork')
            : localizeError(result.error)
      setError(codeMsg)
      return
    }
    applyStored(result.suggestion, result.suggestion.proposed_changes.map((c) => c.id), true)
    await loadTaskLookup()
  }

  function dismiss() {
    setOpen(false)
    setError(null)
    setLoading(false)
  }

  async function onApply() {
    if (!suggestion) return
    const approved = suggestion.proposed_changes.filter((c) => selected.has(c.id))
    if (approved.length === 0) {
      setError(t('schedulePlanPickOne'))
      return
    }
    setApplying(true)
    setError(null)
    const result = await window.todoApi.schedule.apply(approved)
    setApplying(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setToast(t('scheduleApplyOk', { count: result.updatedCount }))
    onApplied()
    await loadTaskLookup()
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const showPanel = open && (loading || suggestion || error)

  return (
    <>
      <div className="schedule-plan-bar">
        <button type="button" className="btn-primary schedule-plan-trigger" onClick={() => void onSuggest()}>
          {t('schedulePlan')}
        </button>
        {suggestion && !open ? (
          <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
            {t('schedulePlanReview')}
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <section className="panel schedule-plan-panel" aria-busy={loading || applying}>
          <div className="schedule-plan-header">
            <h2 className="section-title">{t('schedulePlanTitle')}</h2>
            <button type="button" className="btn-ghost" onClick={dismiss}>
              {t('schedulePlanDismiss')}
            </button>
          </div>

          {loading ? <p className="schedule-plan-muted">{t('schedulePlanLoading')}</p> : null}
          {error ? <p className="banner-error">{error}</p> : null}
          {toast ? <p className="settings-toast">{toast}</p> : null}

          {suggestion && !loading ? (
            <>
              <div className="schedule-plan-notes">
                <h3 className="schedule-plan-subtitle">{t('schedulePlanNotes')}</h3>
                <p>{suggestion.notes}</p>
              </div>

              {suggestion.ordered_ids.length > 0 ? (
                <div className="schedule-plan-block">
                  <h3 className="schedule-plan-subtitle">{t('schedulePlanOrder')}</h3>
                  <ol className="schedule-plan-order">
                    {suggestion.ordered_ids.map((id, idx) => (
                      <li key={id}>
                        <span className="schedule-plan-order-idx">{idx + 1}.</span>
                        {taskById.get(id)?.title ?? id.slice(0, 8)}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <div className="schedule-plan-block">
                <h3 className="schedule-plan-subtitle">{t('schedulePlanChanges')}</h3>
                {suggestion.proposed_changes.length === 0 ? (
                  <p className="schedule-plan-muted">{t('schedulePlanEmpty')}</p>
                ) : (
                  <ul className="schedule-plan-changes">
                    {suggestion.proposed_changes.map((change) => {
                      const task = taskById.get(change.id)
                      return (
                        <li key={change.id}>
                          <label className="schedule-plan-change-row">
                            <input
                              type="checkbox"
                              checked={selected.has(change.id)}
                              onChange={() => toggle(change.id)}
                            />
                            <span className="schedule-plan-change-body">
                              <strong>{task?.title ?? change.id}</strong>
                              <span className="schedule-plan-change-fields">
                                {changeSummary(change, locale, t, priorityLabel, statusLabel)}
                              </span>
                              {change.reason ? (
                                <span className="schedule-plan-reason">
                                  {t('schedulePlanReason')}: {change.reason}
                                </span>
                              ) : null}
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              {suggestion.proposed_changes.length > 0 ? (
                <div className="schedule-plan-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={applying || selected.size === 0}
                    onClick={() => void onApply()}
                  >
                    {t('schedulePlanApply')}
                  </button>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
