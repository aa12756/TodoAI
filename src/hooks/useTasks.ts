import { useCallback, useEffect, useState } from 'react'
import type { CreateTaskInput, Task, TaskFilter, UpdateTaskInput } from '@shared/types'
import { useLocale } from '../i18n/LocaleContext'

export function useTasks(filter: TaskFilter) {
  const { localizeError } = useLocale()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await window.todoApi.tasks.list(filter)
      setTasks(list)
    } catch (e) {
      setError(localizeError((e as Error).message))
    } finally {
      setLoading(false)
    }
  }, [filter, localizeError])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const create = useCallback(
    async (input: CreateTaskInput) => {
      const result = await window.todoApi.tasks.create(input)
      if (!result.ok) {
        setError(localizeError(result.error))
        return false
      }
      await refresh()
      return true
    },
    [localizeError, refresh]
  )

  const update = useCallback(
    async (id: string, input: UpdateTaskInput) => {
      const result = await window.todoApi.tasks.update(id, input)
      if (!result.ok) {
        setError(localizeError(result.error))
        return false
      }
      await refresh()
      return true
    },
    [localizeError, refresh]
  )

  const complete = useCallback(
    async (id: string) => {
      const result = await window.todoApi.tasks.complete(id)
      if (!result.ok) {
        setError(localizeError(result.error))
        return false
      }
      await refresh()
      return true
    },
    [localizeError, refresh]
  )

  const remove = useCallback(
    async (id: string) => {
      const result = await window.todoApi.tasks.delete(id)
      if (!result.ok) {
        setError(localizeError(result.error))
        return false
      }
      await refresh()
      return true
    },
    [localizeError, refresh]
  )

  const clearError = useCallback(() => setError(null), [])

  return { tasks, loading, error, refresh, create, update, complete, remove, clearError }
}
