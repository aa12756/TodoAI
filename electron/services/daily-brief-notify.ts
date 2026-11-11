import { getMainWindow } from '../main/lifecycle'

export function emitDailyBriefUpdated(dateKey: string): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('dailyBrief:updated', dateKey)
  }
}
