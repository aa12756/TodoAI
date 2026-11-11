import { randomUUID } from 'crypto'
import type {
  CreateTaskInput,
  Task,
  TaskFilter,
  TaskPriority,
  UpdateTaskInput
} from '../../shared/types'
import {
  dueInRange,
  endOfMonth,
  endOfWeekSunday,
  startOfMonth,
  startOfWeekMonday
} from '../../shared/date-ranges'
import { clearReminderFlags } from './reminder-flags'
import { getDatabase } from './database'

function nowIso(): string {
  return new Date().toISOString()
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    note: row.note as string,
    due_at: (row.due_at as string | null) ?? null,
    priority: row.priority as TaskPriority,
    status: row.status as Task['status'],
    last_notified_at: (row.last_notified_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string
  }
}

function startOfTodayLocal(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfTodayLocal(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export function listTasks(filter: TaskFilter = 'all'): Task[] {
  const db = getDatabase()
  const all = db
    .prepare(
      `SELECT * FROM tasks ORDER BY
        CASE status WHEN 'open' THEN 0 ELSE 1 END,
        priority DESC,
        due_at IS NULL,
        due_at ASC,
        updated_at DESC`
    )
    .all() as Record<string, unknown>[]

  const tasks = all.map(rowToTask)

  if (filter === 'all') return tasks.filter((t) => t.status === 'open')
  if (filter === 'done') return tasks.filter((t) => t.status === 'done')

  const open = tasks.filter((t) => t.status === 'open')
  const start = startOfTodayLocal()
  const end = endOfTodayLocal()

  if (filter === 'today') {
    return open.filter((t) => {
      if (!t.due_at) return false
      const due = new Date(t.due_at)
      return due >= start && due <= end
    })
  }

  if (filter === 'overdue') {
    const now = new Date()
    return open.filter((t) => t.due_at && new Date(t.due_at) < now)
  }

  const now = new Date()
  const thisWeekStart = startOfWeekMonday(now)
  const thisWeekEnd = endOfWeekSunday(thisWeekStart)
  const nextWeekStart = new Date(thisWeekStart)
  nextWeekStart.setDate(nextWeekStart.getDate() + 7)
  const nextWeekEnd = endOfWeekSunday(nextWeekStart)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  if (filter === 'this_week') {
    return open.filter((t) => t.due_at && dueInRange(t.due_at, thisWeekStart, thisWeekEnd))
  }

  if (filter === 'next_week') {
    return open.filter((t) => t.due_at && dueInRange(t.due_at, nextWeekStart, nextWeekEnd))
  }

  if (filter === 'this_month') {
    return open.filter((t) => t.due_at && dueInRange(t.due_at, monthStart, monthEnd))
  }

  return tasks
}

/** 提醒调度：所有未归档且含截止时间的待办 */
export function listOpenTasksWithDue(): Task[] {
  const db = getDatabase()
  const rows = db
    .prepare(
      `SELECT * FROM tasks WHERE status = 'open' AND due_at IS NOT NULL ORDER BY due_at ASC`
    )
    .all() as Record<string, unknown>[]
  return rows.map(rowToTask)
}

export function touchTaskNotified(id: string): void {
  getDatabase()
    .prepare('UPDATE tasks SET last_notified_at = ? WHERE id = ?')
    .run(nowIso(), id)
}

export function getTask(id: string): Task | null {
  const db = getDatabase()
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined
  return row ? rowToTask(row) : null
}

export function createTask(input: CreateTaskInput): Task {
  const title = input.title.trim()
  if (!title) throw new Error('标题不能为空')

  const id = randomUUID()
  const ts = nowIso()
  const priority = input.priority ?? 1
  const note = input.note?.trim() ?? ''

  getDatabase()
    .prepare(
      `INSERT INTO tasks (id, title, note, due_at, priority, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, ?)`
    )
    .run(id, title, note, input.due_at ?? null, priority, ts, ts)

  return getTask(id)!
}

export function updateTask(id: string, input: UpdateTaskInput): Task {
  const existing = getTask(id)
  if (!existing) throw new Error('任务不存在')

  const title = input.title !== undefined ? input.title.trim() : existing.title
  if (!title) throw new Error('标题不能为空')

  const nextDue = input.due_at !== undefined ? input.due_at : existing.due_at
  if (nextDue !== existing.due_at) {
    clearReminderFlags(id)
  }

  const updated_at = nowIso()
  getDatabase()
    .prepare(
      `UPDATE tasks SET
        title = ?,
        note = ?,
        due_at = ?,
        priority = ?,
        status = ?,
        updated_at = ?
       WHERE id = ?`
    )
    .run(
      title,
      input.note !== undefined ? input.note : existing.note,
      input.due_at !== undefined ? input.due_at : existing.due_at,
      input.priority !== undefined ? input.priority : existing.priority,
      input.status !== undefined ? input.status : existing.status,
      updated_at,
      id
    )

  return getTask(id)!
}

export function deleteTask(id: string): void {
  const result = getDatabase().prepare('DELETE FROM tasks WHERE id = ?').run(id)
  if (result.changes === 0) throw new Error('任务不存在')
  clearReminderFlags(id)
}

export function completeTask(id: string): Task {
  clearReminderFlags(id)
  return updateTask(id, { status: 'done' })
}
