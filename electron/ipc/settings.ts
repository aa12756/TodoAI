import { ipcMain } from 'electron'
import {
  getCloseWindowAction,
  getDailyBriefPreferences,
  getReminderPreferences,
  resetCloseWindowAction,
  setCloseWindowAction,
  setDailyBriefPreferences,
  setReminderPreferences
} from '../db/settings-repo'
import type { CloseWindowAction } from '../../shared/settings'
import type { AiSettingsForm } from '../../shared/ai'
import type { DailyBriefPreferences } from '../../shared/daily-brief'
import type { ReminderPreferences } from '../../shared/reminder'
import { getAiSettingsPublic, setAiSettings } from '../db/settings-repo'

function isCloseAction(value: unknown): value is CloseWindowAction {
  return value === 'ask' || value === 'minimize' || value === 'quit'
}

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:getCloseAction', () => {
    return getCloseWindowAction()
  })

  ipcMain.handle('settings:setCloseAction', (_event, action: unknown) => {
    try {
      if (!isCloseAction(action)) {
        return { ok: false as const, error: 'invalid action' }
      }
      setCloseWindowAction(action)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })

  ipcMain.handle('settings:resetCloseAction', () => {
    resetCloseWindowAction()
    return { ok: true as const }
  })

  ipcMain.handle('settings:getReminder', () => getReminderPreferences())

  ipcMain.handle('settings:getAi', () => getAiSettingsPublic())

  ipcMain.handle('settings:setAi', (_event, form: unknown) => {
    try {
      if (!form || typeof form !== 'object') {
        return { ok: false as const, error: 'invalid' }
      }
      const f = form as AiSettingsForm
      if (typeof f.apiKey !== 'string' || typeof f.baseUrl !== 'string') {
        return { ok: false as const, error: 'invalid' }
      }
      setAiSettings(f)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })

  ipcMain.handle('settings:getDailyBrief', () => getDailyBriefPreferences())

  ipcMain.handle('settings:setDailyBrief', (_event, prefs: unknown) => {
    try {
      if (!prefs || typeof prefs !== 'object') {
        return { ok: false as const, error: 'invalid' }
      }
      const p = prefs as DailyBriefPreferences
      if (typeof p.enabled !== 'boolean' || typeof p.hour !== 'number') {
        return { ok: false as const, error: 'invalid' }
      }
      setDailyBriefPreferences({
        enabled: p.enabled,
        hour: Math.min(Math.max(0, Math.floor(p.hour)), 23)
      })
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })

  ipcMain.handle('settings:setReminder', (_event, prefs: unknown) => {
    try {
      if (!prefs || typeof prefs !== 'object') {
        return { ok: false as const, error: 'invalid' }
      }
      const p = prefs as ReminderPreferences
      if (typeof p.enabled !== 'boolean' || typeof p.minutesBefore !== 'number') {
        return { ok: false as const, error: 'invalid' }
      }
      setReminderPreferences({
        enabled: p.enabled,
        minutesBefore: Math.min(Math.max(0, Math.floor(p.minutesBefore)), 24 * 60)
      })
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })
}
