import { ipcMain } from 'electron'
import type { CreateTaskInput, TaskFilter, UpdateTaskInput } from '../../shared/types'
import * as repo from '../db/tasks-repo'

export function registerTaskIpc(): void {
  ipcMain.handle('tasks:list', (_event, filter?: TaskFilter) => {
    return repo.listTasks(filter ?? 'all')
  })

  ipcMain.handle('tasks:get', (_event, id: string) => {
    return repo.getTask(id)
  })

  ipcMain.handle('tasks:create', (_event, input: CreateTaskInput) => {
    try {
      return { ok: true as const, task: repo.createTask(input) }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })

  ipcMain.handle('tasks:update', (_event, id: string, input: UpdateTaskInput) => {
    try {
      return { ok: true as const, task: repo.updateTask(id, input) }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })

  ipcMain.handle('tasks:delete', (_event, id: string) => {
    try {
      repo.deleteTask(id)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })

  ipcMain.handle('tasks:complete', (_event, id: string) => {
    try {
      return { ok: true as const, task: repo.completeTask(id) }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })
}
