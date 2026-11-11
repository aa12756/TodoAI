import {
  DEFAULT_CLOSE_WINDOW_ACTION,
  SETTING_CLOSE_WINDOW_ACTION,
  parseCloseWindowAction,
  type CloseWindowAction
} from '../../shared/settings'
import {
  DEFAULT_DAILY_BRIEF_ENABLED,
  DEFAULT_DAILY_BRIEF_HOUR,
  SETTING_DAILY_BRIEF_ENABLED,
  SETTING_DAILY_BRIEF_HOUR,
  parseDailyBriefEnabled,
  parseDailyBriefHour,
  type DailyBriefPreferences
} from '../../shared/daily-brief'
import {
  DEFAULT_REMINDER_ENABLED,
  DEFAULT_REMINDER_MINUTES,
  SETTING_REMINDER_ENABLED,
  SETTING_REMINDER_MINUTES,
  parseReminderEnabled,
  parseReminderMinutes,
  type ReminderPreferences
} from '../../shared/reminder'
import {
  API_KEY_MASK,
  DEFAULT_AI_BASE_URL,
  DEFAULT_AI_MODEL,
  DEFAULT_TIMEZONE,
  SETTING_AI_API_KEY,
  SETTING_AI_BASE_URL,
  SETTING_AI_MODEL,
  SETTING_TIMEZONE,
  type AiSettings,
  type AiSettingsForm,
  type AiSettingsPublic
} from '../../shared/ai'
import { getDatabase } from './database'

export function getSetting(key: string): string | null {
  const row = getDatabase()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value?: string } | undefined
  return row?.value ?? null
}

export function setSetting(key: string, value: string): void {
  getDatabase().prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(key, value)
}

export function getCloseWindowAction(): CloseWindowAction {
  return parseCloseWindowAction(getSetting(SETTING_CLOSE_WINDOW_ACTION))
}

export function setCloseWindowAction(action: CloseWindowAction): void {
  setSetting(SETTING_CLOSE_WINDOW_ACTION, action)
}

export function resetCloseWindowAction(): void {
  setCloseWindowAction(DEFAULT_CLOSE_WINDOW_ACTION)
}

export function deleteSetting(key: string): void {
  getDatabase().prepare('DELETE FROM settings WHERE key = ?').run(key)
}

export function deleteSettingsByPrefix(prefix: string): void {
  getDatabase().prepare('DELETE FROM settings WHERE key LIKE ?').run(`${prefix}%`)
}

export function getReminderPreferences(): ReminderPreferences {
  return {
    enabled: parseReminderEnabled(getSetting(SETTING_REMINDER_ENABLED)),
    minutesBefore: parseReminderMinutes(
      getSetting(SETTING_REMINDER_MINUTES) ?? String(DEFAULT_REMINDER_MINUTES)
    )
  }
}

export function setReminderPreferences(prefs: ReminderPreferences): void {
  setSetting(SETTING_REMINDER_ENABLED, prefs.enabled ? '1' : '0')
  setSetting(SETTING_REMINDER_MINUTES, String(prefs.minutesBefore))
}

export function getDailyBriefPreferences(): DailyBriefPreferences {
  return {
    enabled: parseDailyBriefEnabled(getSetting(SETTING_DAILY_BRIEF_ENABLED)),
    hour: parseDailyBriefHour(
      getSetting(SETTING_DAILY_BRIEF_HOUR) ?? String(DEFAULT_DAILY_BRIEF_HOUR)
    )
  }
}

export function setDailyBriefPreferences(prefs: DailyBriefPreferences): void {
  setSetting(SETTING_DAILY_BRIEF_ENABLED, prefs.enabled ? '1' : '0')
  setSetting(SETTING_DAILY_BRIEF_HOUR, String(parseDailyBriefHour(String(prefs.hour))))
}

export function getAiSettings(): AiSettings {
  return {
    apiKey: getSetting(SETTING_AI_API_KEY) ?? '',
    baseUrl: getSetting(SETTING_AI_BASE_URL) ?? DEFAULT_AI_BASE_URL,
    model: getSetting(SETTING_AI_MODEL) ?? DEFAULT_AI_MODEL,
    timezone: getSetting(SETTING_TIMEZONE) ?? DEFAULT_TIMEZONE
  }
}

export function getAiSettingsPublic(): AiSettingsPublic {
  const { apiKey, baseUrl, model, timezone } = getAiSettings()
  return {
    hasApiKey: Boolean(apiKey),
    apiKeyMasked: apiKey ? API_KEY_MASK : '',
    baseUrl,
    model,
    timezone
  }
}

export function setAiSettings(form: AiSettingsForm): void {
  const trimmedKey = form.apiKey.trim()
  if (trimmedKey && trimmedKey !== API_KEY_MASK) {
    setSetting(SETTING_AI_API_KEY, trimmedKey)
  }
  setSetting(SETTING_AI_BASE_URL, form.baseUrl.trim() || DEFAULT_AI_BASE_URL)
  setSetting(SETTING_AI_MODEL, form.model.trim() || DEFAULT_AI_MODEL)
  setSetting(SETTING_TIMEZONE, form.timezone.trim() || DEFAULT_TIMEZONE)
}
