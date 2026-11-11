import { useCallback, useEffect, useState } from 'react'
import type { DailyBriefRecord, DailyBriefSummary } from '@shared/daily-brief'
import { useLocale } from '../i18n/LocaleContext'

interface DailyBriefPageProps {
  selectedDateKey: string | null
  onSelectDateKey: (dateKey: string | null) => void
  isActive: boolean
}

function formatBriefDate(locale: string, dateKey: string, createdAt: string): string {
  try {
    const d = new Date(createdAt)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    }
  } catch {
    /* ignore */
  }
  return dateKey
}

export function DailyBriefPage({ selectedDateKey, onSelectDateKey, isActive }: DailyBriefPageProps) {
  const { t, locale } = useLocale()
  const [summaries, setSummaries] = useState<DailyBriefSummary[]>([])
  const [record, setRecord] = useState<DailyBriefRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshList = useCallback(async () => {
    const list = await window.todoApi.dailyBrief.list()
    setSummaries(list)
    if (list.length && !selectedDateKey) {
      onSelectDateKey(list[0].dateKey)
    }
    return list
  }, [onSelectDateKey, selectedDateKey])

  useEffect(() => {
    if (!isActive) return
    setLoading(true)
    void refreshList().finally(() => setLoading(false))
  }, [isActive, refreshList])

  useEffect(() => {
    return window.todoApi.events.onDailyBriefUpdated((dateKey) => {
      void refreshList().then((list) => {
        if (dateKey) onSelectDateKey(dateKey)
        else if (list[0]) onSelectDateKey(list[0].dateKey)
      })
    })
  }, [onSelectDateKey, refreshList])

  useEffect(() => {
    if (!selectedDateKey) {
      setRecord(null)
      return
    }
    void window.todoApi.dailyBrief.get(selectedDateKey).then(setRecord)
  }, [selectedDateKey])

  return (
    <section className="panel brief-page">
      <header className="brief-page-header">
        <h2 className="section-title">{t('dailyBriefTitle')}</h2>
        <p className="settings-hint">{t('dailyBriefSubtitle')}</p>
      </header>

      {loading ? (
        <p className="empty">{t('loading')}</p>
      ) : summaries.length === 0 ? (
        <p className="empty">{t('dailyBriefEmpty')}</p>
      ) : (
        <div className="brief-layout">
          <aside className="brief-sidebar" aria-label={t('dailyBriefHistory')}>
            <ul className="brief-date-list">
              {summaries.map((item) => (
                <li key={item.dateKey}>
                  <button
                    type="button"
                    className={selectedDateKey === item.dateKey ? 'active' : ''}
                    onClick={() => onSelectDateKey(item.dateKey)}
                  >
                    <span className="brief-date-key">{item.dateKey}</span>
                    <span className="brief-date-time">
                      {formatBriefDate(locale, item.dateKey, item.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <article className="brief-detail">
            {record ? (
              <>
                <div className="brief-detail-meta">
                  <time dateTime={record.createdAt}>
                    {formatBriefDate(locale, record.dateKey, record.createdAt)}
                  </time>
                </div>
                {record.aiSummary ? (
                  <div className="brief-ai-block">
                    <h3>{t('dailyBriefAiSection')}</h3>
                    <p>{record.aiSummary}</p>
                  </div>
                ) : (
                  <p className="brief-no-ai">{t('dailyBriefNoAi')}</p>
                )}
                <div className="brief-tasks-block">
                  <h3>{t('dailyBriefTasksSection')}</h3>
                  <pre className="brief-task-text">{record.taskBlock}</pre>
                </div>
              </>
            ) : (
              <p className="empty">{t('dailyBriefPickDay')}</p>
            )}
          </article>
        </div>
      )}
    </section>
  )
}
