import type { ProposedTaskChange } from '../../shared/schedule'
import type { UpdateTaskInput } from '../../shared/types'
import * as tasksRepo from '../db/tasks-repo'

export function applyScheduleChanges(changes: ProposedTaskChange[]): {
  updatedCount: number
  errors: string[]
} {
  const errors: string[] = []
  let updatedCount = 0

  for (const change of changes) {
    const existing = tasksRepo.getTask(change.id)
    if (!existing) {
      errors.push(`任务不存在: ${change.id}`)
      continue
    }

    const input: UpdateTaskInput = {}
    if (change.title !== undefined) input.title = change.title
    if (change.note !== undefined) input.note = change.note
    if (change.due_at !== undefined) input.due_at = change.due_at
    if (change.priority !== undefined) input.priority = change.priority
    if (change.status !== undefined) input.status = change.status

    if (Object.keys(input).length === 0) continue

    try {
      tasksRepo.updateTask(change.id, input)
      updatedCount += 1
    } catch (e) {
      errors.push(`${change.id}: ${(e as Error).message}`)
    }
  }

  return { updatedCount, errors }
}
