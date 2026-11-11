import { ipcMain } from 'electron'
import { setMainLocale } from '../main/locale-state'
import { applyAppMenu } from '../menu/app-menu'
import { updateTrayMenu } from '../tray'
import type { Locale } from '../../shared/locale'

function isLocale(value: unknown): value is Locale {
  return value === 'zh' || value === 'en'
}

export function registerAppIpc(): void {
  ipcMain.handle('app:setLocale', (_event, locale: unknown) => {
    if (!isLocale(locale)) return { ok: false as const, error: 'invalid locale' }
    setMainLocale(locale)
    applyAppMenu(locale)
    updateTrayMenu(locale)
    return { ok: true as const }
  })
}
