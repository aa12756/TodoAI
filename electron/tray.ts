import { Menu, Tray, nativeImage } from 'electron'
import type { Locale } from '../shared/locale'
import { getMainLocale } from './main/locale-state'
import { requestQuit, showMainWindow } from './main/lifecycle'
import { resolveTrayIconPath } from './main/paths'
import { showTestNotification } from './services/notification-service'

let tray: Tray | null = null

function loadTrayImage() {
  const file = resolveTrayIconPath()
  if (!file) {
    throw new Error('Tray icon missing. Run: node scripts/write-tray-icon.mjs')
  }

  let image = nativeImage.createFromPath(file)
  if (image.isEmpty()) {
    throw new Error(`Tray icon unreadable: ${file}`)
  }

  if (process.platform === 'win32') {
    image = image.resize({ width: 32, height: 32, quality: 'best' })
  } else if (process.platform === 'darwin') {
    image = image.resize({ width: 22, height: 22 })
  }

  return image
}

function buildContextMenu(locale: Locale): Menu {
  const zh = locale === 'zh'
  return Menu.buildFromTemplate([
    {
      label: zh ? '显示主窗口' : 'Show main window',
      click: () => showMainWindow()
    },
    {
      label: zh ? '测试系统通知' : 'Test notification',
      click: () => showTestNotification(locale)
    },
    { type: 'separator' },
    {
      label: zh ? '退出 TodoAI' : 'Quit TodoAI',
      click: () => requestQuit()
    }
  ])
}

export function initTray(): void {
  if (tray) return

  const image = loadTrayImage()
  tray = new Tray(image)
  tray.setToolTip('TodoAI')
  tray.setContextMenu(buildContextMenu(getMainLocale()))

  tray.on('double-click', () => {
    showMainWindow()
  })
}

export function updateTrayMenu(locale: Locale): void {
  if (!tray) return
  tray.setContextMenu(buildContextMenu(locale))
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy()
    tray = null
  }
}
