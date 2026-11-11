import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type { AiStreamHandlers, AiStreamServerEvent } from '../../shared/ai'
import type { TodoApi } from '../../shared/api'

const todoApi: TodoApi = {
  app: {
    setLocale: (locale) => ipcRenderer.invoke('app:setLocale', locale)
  },
  notification: {
    test: () => ipcRenderer.invoke('notification:test'),
    testDailyBrief: () => ipcRenderer.invoke('notification:testDailyBrief')
  },
  dailyBrief: {
    list: () => ipcRenderer.invoke('dailyBrief:list'),
    get: (dateKey) => ipcRenderer.invoke('dailyBrief:get', dateKey)
  },
  ai: {
    suggestSchedule: () => ipcRenderer.invoke('ai:suggestSchedule'),
    chatStream: (history, handlers: AiStreamHandlers) =>
      new Promise<void>((resolve, reject) => {
        const onStream = (_event: IpcRendererEvent, payload: AiStreamServerEvent) => {
          switch (payload.type) {
            case 'thinking':
              handlers.onThinking(payload.text)
              break
            case 'delta':
              handlers.onDelta(payload.text)
              break
            case 'done':
              handlers.onDone(payload.tasksChanged, payload.totalTokens)
              cleanup()
              resolve()
              break
            case 'error':
              handlers.onError(payload.message, payload.code)
              cleanup()
              reject(new Error(payload.message))
              break
            default:
              break
          }
        }
        const cleanup = () => ipcRenderer.removeListener('ai:stream', onStream)
        ipcRenderer.on('ai:stream', onStream)
        void ipcRenderer.invoke('ai:chat-stream', history).then((result) => {
          if (result && !result.ok) {
            cleanup()
            reject(new Error('stream failed'))
          }
        })
      })
  },
  schedule: {
    getLast: () => ipcRenderer.invoke('schedule:getLast'),
    saveState: (suggestion, selectedIds) =>
      ipcRenderer.invoke('schedule:saveState', { suggestion, selectedIds }),
    apply: (changes) => ipcRenderer.invoke('schedule:apply', changes)
  },
  chat: {
    bootstrap: (legacyJson) => ipcRenderer.invoke('chat:bootstrap', legacyJson),
    list: () => ipcRenderer.invoke('chat:list'),
    get: (id) => ipcRenderer.invoke('chat:get', id),
    create: (title) => ipcRenderer.invoke('chat:create', title),
    save: (input) => ipcRenderer.invoke('chat:save', input),
    delete: (id) => ipcRenderer.invoke('chat:delete', id),
    setActive: (id) => ipcRenderer.invoke('chat:setActive', id)
  },
  settings: {
    getCloseAction: () => ipcRenderer.invoke('settings:getCloseAction'),
    setCloseAction: (action) => ipcRenderer.invoke('settings:setCloseAction', action),
    resetCloseAction: () => ipcRenderer.invoke('settings:resetCloseAction'),
    getReminder: () => ipcRenderer.invoke('settings:getReminder'),
    setReminder: (prefs) => ipcRenderer.invoke('settings:setReminder', prefs),
    getDailyBrief: () => ipcRenderer.invoke('settings:getDailyBrief'),
    setDailyBrief: (prefs) => ipcRenderer.invoke('settings:setDailyBrief', prefs),
    getAi: () => ipcRenderer.invoke('settings:getAi'),
    setAi: (form) => ipcRenderer.invoke('settings:setAi', form)
  },
  events: {
    onNotificationClicked: (callback) => {
      const listener = (_event: IpcRendererEvent, taskId: string) => callback(taskId)
      ipcRenderer.on('notification:clicked', listener)
      return () => ipcRenderer.removeListener('notification:clicked', listener)
    },
    onTasksChanged: (callback) => {
      const listener = () => callback()
      ipcRenderer.on('tasks:changed', listener)
      return () => ipcRenderer.removeListener('tasks:changed', listener)
    },
    onDailyBriefUpdated: (callback) => {
      const listener = (_event: IpcRendererEvent, dateKey: string) => callback(dateKey)
      ipcRenderer.on('dailyBrief:updated', listener)
      return () => ipcRenderer.removeListener('dailyBrief:updated', listener)
    },
    onOpenDailyBrief: (callback) => {
      const listener = (_event: IpcRendererEvent, dateKey: string) => callback(dateKey)
      ipcRenderer.on('notification:dailyBrief', listener)
      return () => ipcRenderer.removeListener('notification:dailyBrief', listener)
    }
  },
  tasks: {
    list: (filter) => ipcRenderer.invoke('tasks:list', filter),
    get: (id) => ipcRenderer.invoke('tasks:get', id),
    create: (input) => ipcRenderer.invoke('tasks:create', input),
    update: (id, input) => ipcRenderer.invoke('tasks:update', id, input),
    delete: (id) => ipcRenderer.invoke('tasks:delete', id),
    complete: (id) => ipcRenderer.invoke('tasks:complete', id)
  }
}

contextBridge.exposeInMainWorld('todoApi', todoApi)
