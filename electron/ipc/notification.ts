import { ipcMain } from 'electron'
import { getMainLocale } from '../main/locale-state'
import { sendDailyBrief } from '../services/daily-brief-service'
import { showTestNotification } from '../services/notification-service'

export function registerNotificationIpc(): void {
  ipcMain.handle('notification:test', () => {
    const ok = showTestNotification(getMainLocale())
    return ok ? ({ ok: true as const } as const) : ({ ok: false as const, error: 'unsupported' } as const)
  })

  ipcMain.handle('notification:testDailyBrief', async () => {
    const result = await sendDailyBrief({ force: true })
    return result.shown
      ? ({ ok: true as const, dateKey: result.dateKey } as const)
      : ({ ok: false as const, error: 'unsupported' } as const)
  })
}
