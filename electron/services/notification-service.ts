import { Notification } from 'electron'
import type { Locale } from '../../shared/locale'
import { getMainWindow, showMainWindow } from '../main/lifecycle'

export interface TodoNotificationOptions {
  title: string
  body: string
  taskId?: string
  openDailyBrief?: boolean
  dailyBriefDateKey?: string
}

function notifyStrings(locale: Locale): { testTitle: string; testBody: string; trayHintTitle: string; trayHintBody: string } {
  if (locale === 'zh') {
    return {
      testTitle: 'TodoAI 通知测试',
      testBody: '系统通知工作正常。点击此通知可打开主窗口。',
      trayHintTitle: 'TodoAI 已在托盘运行',
      trayHintBody: '关闭窗口不会退出。点击托盘图标可重新打开。'
    }
  }
  return {
    testTitle: 'TodoAI notification test',
    testBody: 'Notifications are working. Click to open the main window.',
    trayHintTitle: 'TodoAI is running in the tray',
    trayHintBody: 'Closing the window keeps the app running. Click the tray icon to reopen.'
  }
}

export function showTodoNotification(options: TodoNotificationOptions): boolean {
  if (!Notification.isSupported()) return false

  const notification = new Notification({
    title: options.title,
    body: options.body,
    silent: false
  })

  notification.on('click', () => {
    showMainWindow()
    const win = getMainWindow()
    if (!win || win.isDestroyed()) return
    if (options.openDailyBrief) {
      win.webContents.send('notification:dailyBrief', options.dailyBriefDateKey ?? '')
    } else if (options.taskId) {
      win.webContents.send('notification:clicked', options.taskId)
    }
  })

  notification.show()
  return true
}

export function showTestNotification(locale: Locale): boolean {
  const copy = notifyStrings(locale)
  return showTodoNotification({ title: copy.testTitle, body: copy.testBody })
}

export function showTrayHintNotification(locale: Locale): boolean {
  const copy = notifyStrings(locale)
  return showTodoNotification({ title: copy.trayHintTitle, body: copy.trayHintBody })
}
