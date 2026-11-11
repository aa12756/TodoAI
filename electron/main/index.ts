import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { closeDatabase, initDatabase } from '../db/database'
import { registerAppIpc } from '../ipc/app'
import { registerDailyBriefIpc } from '../ipc/daily-brief'
import { registerNotificationIpc } from '../ipc/notification'
import { registerAiIpc } from '../ipc/ai'
import { registerChatIpc } from '../ipc/chat'
import { registerScheduleIpc } from '../ipc/schedule'
import { registerSettingsIpc } from '../ipc/settings'
import { registerTaskIpc } from '../ipc/tasks'
import { applyAppMenu } from '../menu/app-menu'
import { handleWindowCloseRequest } from '../services/close-prompt'
import { startReminderService, stopReminderService } from '../services/reminder-service'
import { destroyTray, initTray } from '../tray'
import { DEFAULT_LOCALE } from '../../shared/locale'
import { resolveWindowIconPath } from './paths'
import {
  isQuitAllowed,
  requestQuit,
  setMainWindow,
  showMainWindow
} from './lifecycle'

function createWindow(): void {
  const iconPath = resolveWindowIconPath()
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 740,
    minWidth: 800,
    minHeight: 560,
    show: false,
    title: 'TodoAI',
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  setMainWindow(mainWindow)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.on('close', (event) => {
    if (isQuitAllowed()) return
    event.preventDefault()
    void handleWindowCloseRequest(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

if (process.platform === 'win32') {
  app.setAppUserModelId('com.todoai.desktop')
}

app.whenReady().then(async () => {
  await initDatabase()
  applyAppMenu(DEFAULT_LOCALE)
  registerTaskIpc()
  registerAppIpc()
  registerDailyBriefIpc()
  registerNotificationIpc()
  registerSettingsIpc()
  registerAiIpc()
  registerChatIpc()
  registerScheduleIpc()
  initTray()
  startReminderService()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      showMainWindow()
    }
  })
})

/** 托盘常驻：不因窗口关闭而退出 */
app.on('window-all-closed', () => {
  /* intentionally empty */
})

app.on('before-quit', (event) => {
  if (!isQuitAllowed()) {
    event.preventDefault()
    return
  }
  stopReminderService()
  destroyTray()
  closeDatabase()
})

/** 开发时仍可通过进程信号结束；生产从托盘/菜单退出 */
process.on('SIGINT', () => requestQuit())
