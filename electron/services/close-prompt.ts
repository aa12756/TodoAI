import { BrowserWindow, dialog } from 'electron'
import type { Locale } from '../../shared/locale'
import type { CloseWindowAction } from '../../shared/settings'
import { getCloseWindowAction, setCloseWindowAction } from '../db/settings-repo'
import { getMainLocale } from '../main/locale-state'
import { hideMainWindow, isQuitAllowed, requestQuit } from '../main/lifecycle'

function dialogCopy(locale: Locale) {
  if (locale === 'zh') {
    return {
      message: '关闭主窗口时，你希望：',
      detail: '应用可继续在系统托盘运行，并在后台处理提醒（后续版本）。',
      minimize: '最小化到托盘',
      quit: '退出程序',
      cancel: '取消',
      remember: '设为默认，不再询问'
    }
  }
  return {
    message: 'When you close the main window:',
    detail: 'The app can keep running in the system tray.',
    minimize: 'Minimize to tray',
    quit: 'Quit application',
    cancel: 'Cancel',
    remember: 'Remember this as default'
  }
}

async function askUser(win: BrowserWindow, locale: Locale): Promise<CloseWindowAction | 'cancel'> {
  const copy = dialogCopy(locale)
  const { response, checkboxChecked } = await dialog.showMessageBox(win, {
    type: 'question',
    title: 'TodoAI',
    message: copy.message,
    detail: copy.detail,
    buttons: [copy.minimize, copy.quit, copy.cancel],
    defaultId: 0,
    cancelId: 2,
    checkboxLabel: copy.remember,
    checkboxChecked: false,
    noLink: true
  })

  if (response === 2) return 'cancel'

  const chosen: CloseWindowAction = response === 0 ? 'minimize' : 'quit'
  if (checkboxChecked) {
    setCloseWindowAction(chosen)
  }
  return chosen
}

export async function handleWindowCloseRequest(win: BrowserWindow): Promise<void> {
  if (isQuitAllowed()) return

  const saved = getCloseWindowAction()
  const locale = getMainLocale()

  let action: CloseWindowAction | 'cancel'
  if (saved === 'ask') {
    action = await askUser(win, locale)
    if (action === 'cancel') return
  } else {
    action = saved
  }

  if (action === 'minimize') {
    hideMainWindow()
    return
  }

  requestQuit()
}
