import { useCallback, useEffect, useState } from 'react'
import {
  API_KEY_MASK,
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_TIMEZONE,
  type AiSettingsForm
} from '@shared/ai'
import type { ReminderPreferences } from '@shared/reminder'
import type { CloseWindowAction } from '@shared/settings'
import { DEFAULT_DAILY_BRIEF_HOUR, type DailyBriefPreferences } from '@shared/daily-brief'
import { DEFAULT_REMINDER_MINUTES } from '@shared/reminder'
import { useLocale } from '../i18n/LocaleContext'

interface SettingsPageProps {
  onOpenBriefTab?: (dateKey?: string) => void
}

export function SettingsPage({ onOpenBriefTab }: SettingsPageProps) {
  const { t } = useLocale()
  const [closeAction, setCloseAction] = useState<CloseWindowAction>('ask')
  const [reminder, setReminder] = useState<ReminderPreferences>({
    enabled: true,
    minutesBefore: DEFAULT_REMINDER_MINUTES
  })
  const [dailyBrief, setDailyBrief] = useState<DailyBriefPreferences>({
    enabled: false,
    hour: DEFAULT_DAILY_BRIEF_HOUR
  })
  const [ai, setAi] = useState<AiSettingsForm>({
    apiKey: '',
    baseUrl: DEFAULT_AI_BASE_URL,
    model: DEFAULT_AI_MODEL,
    timezone: DEFAULT_TIMEZONE
  })
  const [hasApiKey, setHasApiKey] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [action, rem, brief, aiPub] = await Promise.all([
        window.todoApi.settings.getCloseAction(),
        window.todoApi.settings.getReminder(),
        window.todoApi.settings.getDailyBrief(),
        window.todoApi.settings.getAi()
      ])
      setCloseAction(action)
      setReminder(rem)
      setDailyBrief(brief)
      setHasApiKey(aiPub.hasApiKey)
      setAi({
        apiKey: aiPub.hasApiKey ? API_KEY_MASK : '',
        baseUrl: aiPub.baseUrl,
        model: aiPub.model,
        timezone: aiPub.timezone
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function onSaveClose() {
    setSaving(true)
    setMessage(null)
    const result = await window.todoApi.settings.setCloseAction(closeAction)
    setSaving(false)
    if (result.ok) setMessage(t('settingsSaved'))
    else setMessage(result.error)
  }

  async function onResetClose() {
    setSaving(true)
    setMessage(null)
    const result = await window.todoApi.settings.resetCloseAction()
    setSaving(false)
    if (result.ok) {
      setCloseAction('ask')
      setMessage(t('settingsResetClose'))
    }
  }

  async function onSaveAi() {
    setSaving(true)
    setMessage(null)
    const result = await window.todoApi.settings.setAi(ai)
    setSaving(false)
    if (result.ok) {
      setMessage(t('settingsSaved'))
      const pub = await window.todoApi.settings.getAi()
      setHasApiKey(pub.hasApiKey)
      setAi((prev) => ({
        ...prev,
        apiKey: pub.hasApiKey ? API_KEY_MASK : ''
      }))
    } else setMessage(result.error)
  }

  async function onSaveReminder() {
    setSaving(true)
    setMessage(null)
    const result = await window.todoApi.settings.setReminder(reminder)
    setSaving(false)
    if (result.ok) setMessage(t('settingsSaved'))
    else setMessage(result.error)
  }

  async function onSaveDailyBrief() {
    setSaving(true)
    setMessage(null)
    const result = await window.todoApi.settings.setDailyBrief(dailyBrief)
    setSaving(false)
    if (result.ok) setMessage(t('settingsSaved'))
    else setMessage(result.error)
  }

  async function onTestDailyBrief() {
    setMessage(null)
    const result = await window.todoApi.notification.testDailyBrief()
    if (result.ok) {
      setMessage(t('settingsBriefTestOk'))
      onOpenBriefTab?.(result.dateKey)
    } else setMessage(result.error)
  }

  return (
    <section className="panel settings-page">
      <h2 className="section-title">{t('settingsTitle')}</h2>

      {loading ? (
        <p className="empty">{t('loading')}</p>
      ) : (
        <div className="settings-layout">
          <section className="settings-card" aria-labelledby="settings-ai-heading">
            <header className="settings-card-head">
              <p className="settings-section-label">{t('settingsSectionAi')}</p>
              <h3 id="settings-ai-heading" className="settings-card-title">
                {t('settingsAiTitle')}
              </h3>
              <p className="settings-hint">{t('settingsAiHint')}</p>
            </header>

            <label className="field">
              <span>{t('settingsAiApiKey')}</span>
              <input
                type="password"
                autoComplete="off"
                placeholder={hasApiKey ? API_KEY_MASK : t('settingsAiKeyPlaceholder')}
                value={ai.apiKey}
                onChange={(e) => setAi((a) => ({ ...a, apiKey: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>{t('settingsAiBaseUrl')}</span>
              <input
                value={ai.baseUrl}
                onChange={(e) => setAi((a) => ({ ...a, baseUrl: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>{t('settingsAiModel')}</span>
              <input
                value={ai.model}
                onChange={(e) => setAi((a) => ({ ...a, model: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>{t('settingsTimezone')}</span>
              <input
                value={ai.timezone}
                onChange={(e) => setAi((a) => ({ ...a, timezone: e.target.value }))}
              />
            </label>
            <div className="settings-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => void onSaveAi()}
              >
                {t('save')}
              </button>
            </div>
          </section>

          <p className="settings-section-label settings-section-label--standalone">
            {t('settingsSectionNotify')}
          </p>

          <div className="settings-grid-2">
            <section className="settings-card" aria-labelledby="settings-reminder-heading">
              <header className="settings-card-head settings-card-head--compact">
                <h3 id="settings-reminder-heading" className="settings-card-title">
                  {t('settingsReminderTitle')}
                </h3>
                <p className="settings-hint">{t('settingsReminderHint')}</p>
              </header>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={reminder.enabled}
                  onChange={(e) => setReminder((r) => ({ ...r, enabled: e.target.checked }))}
                />
                {t('settingsReminderEnabled')}
              </label>

              <label className="field">
                <span>{t('settingsReminderMinutes')}</span>
                <input
                  type="number"
                  min={0}
                  max={1440}
                  disabled={!reminder.enabled}
                  value={reminder.minutesBefore}
                  onChange={(e) =>
                    setReminder((r) => ({
                      ...r,
                      minutesBefore: Number(e.target.value) || 0
                    }))
                  }
                />
              </label>

              <div className="settings-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() => void onSaveReminder()}
                >
                  {t('save')}
                </button>
              </div>
            </section>

            <section className="settings-card" aria-labelledby="settings-brief-heading">
              <header className="settings-card-head settings-card-head--compact">
                <h3 id="settings-brief-heading" className="settings-card-title">
                  {t('settingsDailyBriefTitle')}
                </h3>
                <p className="settings-hint">{t('settingsDailyBriefHint')}</p>
              </header>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={dailyBrief.enabled}
                  onChange={(e) => setDailyBrief((b) => ({ ...b, enabled: e.target.checked }))}
                />
                {t('settingsDailyBriefEnabled')}
              </label>

              <label className="field">
                <span>{t('settingsDailyBriefHour')}</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  disabled={!dailyBrief.enabled}
                  value={dailyBrief.hour}
                  onChange={(e) =>
                    setDailyBrief((b) => ({
                      ...b,
                      hour: Math.min(23, Math.max(0, Number(e.target.value) || 0))
                    }))
                  }
                />
              </label>

              <div className="settings-actions">
                <button
                  type="button"
                  className="btn-primary"
                  disabled={saving}
                  onClick={() => void onSaveDailyBrief()}
                >
                  {t('save')}
                </button>
                <button type="button" disabled={saving} onClick={() => void onTestDailyBrief()}>
                  {t('settingsDailyBriefTest')}
                </button>
                {onOpenBriefTab && (
                  <button type="button" className="btn-ghost" onClick={onOpenBriefTab}>
                    {t('settingsViewBrief')}
                  </button>
                )}
              </div>
            </section>
          </div>

          <section className="settings-card" aria-labelledby="settings-close-heading">
            <header className="settings-card-head">
              <p className="settings-section-label">{t('settingsSectionApp')}</p>
              <h3 id="settings-close-heading" className="settings-card-title">
                {t('settingsCloseTitle')}
              </h3>
              <p className="settings-hint">{t('settingsCloseHint')}</p>
            </header>

            <fieldset className="radio-group">
              <legend className="sr-only">{t('settingsCloseTitle')}</legend>
              <label>
                <input
                  type="radio"
                  name="closeAction"
                  value="ask"
                  checked={closeAction === 'ask'}
                  onChange={() => setCloseAction('ask')}
                />
                {t('closeActionAsk')}
              </label>
              <label>
                <input
                  type="radio"
                  name="closeAction"
                  value="minimize"
                  checked={closeAction === 'minimize'}
                  onChange={() => setCloseAction('minimize')}
                />
                {t('closeActionMinimize')}
              </label>
              <label>
                <input
                  type="radio"
                  name="closeAction"
                  value="quit"
                  checked={closeAction === 'quit'}
                  onChange={() => setCloseAction('quit')}
                />
                {t('closeActionQuit')}
              </label>
            </fieldset>

            <div className="settings-actions">
              <button
                type="button"
                className="btn-primary"
                disabled={saving}
                onClick={() => void onSaveClose()}
              >
                {t('save')}
              </button>
              <button type="button" disabled={saving} onClick={() => void onResetClose()}>
                {t('settingsResetCloseBtn')}
              </button>
            </div>
          </section>

          {message && <p className="settings-toast settings-toast--bar">{message}</p>}
        </div>
      )}
    </section>
  )
}
