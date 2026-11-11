export type TaskStatus = 'open' | 'done'
export type TaskPriority = 0 | 1 | 2

export interface Task {
  id: string
  title: string
  note: string
  due_at: string | null
  priority: TaskPriority
  status: TaskStatus
  last_notified_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateTaskInput {
  title: string
  note?: string
  due_at?: string | null
  priority?: TaskPriority
}

export interface UpdateTaskInput {
  title?: string
  note?: string
  due_at?: string | null
  priority?: TaskPriority
  status?: TaskStatus
}

export type TaskFilter =
  | 'all'
  | 'today'
  | 'this_week'
  | 'next_week'
  | 'this_month'
  | 'overdue'
  | 'done'
