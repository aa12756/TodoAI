import { getMainWindow } from './lifecycle'

export function notifyTasksChanged(): void {
  const win = getMainWindow()
  if (win && !win.isDestroyed()) {
    win.webContents.send('tasks:changed')
  }
}
