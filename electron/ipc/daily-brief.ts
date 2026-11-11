import { ipcMain } from 'electron'
import { getDailyBriefRecord, listDailyBriefSummaries } from '../db/daily-brief-repo'

export function registerDailyBriefIpc(): void {
  ipcMain.handle('dailyBrief:list', () => listDailyBriefSummaries())

  ipcMain.handle('dailyBrief:get', (_event, dateKey: unknown) => {
    if (typeof dateKey !== 'string' || !dateKey.trim()) return null
    return getDailyBriefRecord(dateKey.trim())
  })
}
