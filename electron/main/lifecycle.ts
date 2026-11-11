import { app, BrowserWindow } from 'electron'
import { closeDatabase } from '../db/database'

let mainWindow: BrowserWindow | null = null
let allowQuit = false

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

export function hideMainWindow(): void {
  mainWindow?.hide()
}

export function isQuitAllowed(): boolean {
  return allowQuit
}

export function requestQuit(): void {
  allowQuit = true
  app.quit()
}
