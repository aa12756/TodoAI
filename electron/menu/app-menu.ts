import { app, BrowserWindow, Menu, dialog, type MenuItemConstructorOptions } from 'electron'
import { requestQuit } from '../main/lifecycle'
import { DEFAULT_LOCALE, type Locale } from '../../shared/locale'

const isDev = !app.isPackaged

function focusedWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

function buildTemplate(locale: Locale): MenuItemConstructorOptions[] {
  const zh = locale === 'zh'

  const fileMenu: MenuItemConstructorOptions = {
    label: zh ? '文件' : 'File',
    submenu: [{ label: zh ? '退出' : 'Exit', accelerator: 'Alt+F4', click: () => requestQuit() }]
  }

  const editMenu: MenuItemConstructorOptions = {
    label: zh ? '编辑' : 'Edit',
    submenu: [
      { label: zh ? '撤销' : 'Undo', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
      { label: zh ? '重做' : 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
      { type: 'separator' },
      { label: zh ? '剪切' : 'Cut', accelerator: 'CmdOrCtrl+X', role: 'cut' },
      { label: zh ? '复制' : 'Copy', accelerator: 'CmdOrCtrl+C', role: 'copy' },
      { label: zh ? '粘贴' : 'Paste', accelerator: 'CmdOrCtrl+V', role: 'paste' },
      { type: 'separator' },
      { label: zh ? '全选' : 'Select All', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
    ]
  }

  const viewSubmenu: MenuItemConstructorOptions[] = [
    { label: zh ? '重新加载' : 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
    { label: zh ? '强制重新加载' : 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
    { type: 'separator' },
    { label: zh ? '实际大小' : 'Actual Size', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
    { label: zh ? '放大' : 'Zoom In', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
    { label: zh ? '缩小' : 'Zoom Out', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
    { type: 'separator' },
    { label: zh ? '切换全屏' : 'Toggle Full Screen', accelerator: 'F11', role: 'togglefullscreen' }
  ]

  if (isDev) {
    viewSubmenu.push(
      { type: 'separator' },
      { label: zh ? '开发者工具' : 'Developer Tools', accelerator: 'F12', role: 'toggleDevTools' }
    )
  }

  const viewMenu: MenuItemConstructorOptions = {
    label: zh ? '视图' : 'View',
    submenu: viewSubmenu
  }

  const windowMenu: MenuItemConstructorOptions = {
    label: zh ? '窗口' : 'Window',
    submenu: [
      { label: zh ? '最小化' : 'Minimize', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
      { label: zh ? '关闭' : 'Close', accelerator: 'CmdOrCtrl+W', role: 'close' }
    ]
  }

  const helpMenu: MenuItemConstructorOptions = {
    label: zh ? '帮助' : 'Help',
    submenu: [
      {
        label: zh ? '了解 TodoAI' : 'About TodoAI',
        click: () => {
          const win = focusedWindow()
          void dialog.showMessageBox(win ?? undefined, {
            type: 'info',
            title: 'TodoAI',
            message: zh ? '个人待办与 AI 助手' : 'Personal todo list with AI assistant',
            buttons: [zh ? '确定' : 'OK']
          })
        }
      }
    ]
  }

  if (process.platform === 'darwin') {
    const appMenu: MenuItemConstructorOptions = {
      label: app.name,
      submenu: [
        { label: zh ? '关于 TodoAI' : 'About TodoAI', role: 'about' },
        { type: 'separator' },
        { label: zh ? '隐藏' : 'Hide', accelerator: 'Command+H', role: 'hide' },
        { label: zh ? '隐藏其他' : 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideOthers' },
        { label: zh ? '显示全部' : 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: zh ? '退出' : 'Quit', accelerator: 'Command+Q', click: () => requestQuit() }
      ]
    }
    return [appMenu, fileMenu, editMenu, viewMenu, windowMenu, helpMenu]
  }

  return [fileMenu, editMenu, viewMenu, windowMenu, helpMenu]
}

export function applyAppMenu(locale: Locale = DEFAULT_LOCALE): void {
  const menu = Menu.buildFromTemplate(buildTemplate(locale))
  Menu.setApplicationMenu(menu)
}
