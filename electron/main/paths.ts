import fs from 'fs'
import path from 'path'
import { app } from 'electron'

function resourceBases(): string[] {
  return [
    path.join(process.cwd(), 'resources'),
    path.join(app.getAppPath(), 'resources'),
    path.join(__dirname, '..', '..', 'resources'),
    path.join(__dirname, '../../resources')
  ]
}

function findResource(names: string[]): string | null {
  for (const base of resourceBases()) {
    for (const name of names) {
      const p = path.join(base, name)
      if (fs.existsSync(p)) return p
    }
  }
  return null
}

/** 托盘用小图 */
export function resolveTrayIconPath(): string | null {
  return findResource(['tray.ico', 'tray.png', 'icon.ico', 'icon.png'])
}

/** 标题栏 / 任务栏窗口图标用大图 */
export function resolveWindowIconPath(): string | null {
  return findResource(['icon.ico', 'icon.png', 'tray.ico', 'tray.png'])
}
