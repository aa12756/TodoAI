import type { TaskFilter, TaskPriority, TaskStatus, UpdateTaskInput } from '../../../shared/types'
import * as tasksRepo from '../../db/tasks-repo'

export const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_tasks',
      description: 'List tasks. filter: all (open only), today, overdue, done, this_week, next_week, this_month',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['all', 'today', 'overdue', 'done', 'this_week', 'next_week', 'this_month']
          }
        }
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_task',
      description: 'Get one task by id including note',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'create_task',
      description: 'Create a new open task',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          note: { type: 'string' },
          due_at: { type: 'string', description: 'ISO8601 datetime' },
          priority: { type: 'integer', enum: [0, 1, 2] }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_task',
      description: 'Update fields of an existing task',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          note: { type: 'string' },
          due_at: { type: ['string', 'null'] },
          priority: { type: 'integer', enum: [0, 1, 2] },
          status: { type: 'string', enum: ['open', 'done'] }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'complete_task',
      description: 'Mark a task as done',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id']
      }
    }
  }
]

export type ToolExecutionResult = { ok: true; data: unknown; mutates: boolean } | { ok: false; error: string }

export function executeTool(name: string, args: Record<string, unknown>): ToolExecutionResult {
  try {
    switch (name) {
      case 'list_tasks': {
        const filter = (args.filter as TaskFilter | undefined) ?? 'all'
        const tasks = tasksRepo.listTasks(filter)
        return { ok: true, data: tasks, mutates: false }
      }
      case 'get_task': {
        const task = tasksRepo.getTask(String(args.id))
        if (!task) return { ok: false, error: '任务不存在' }
        return { ok: true, data: task, mutates: false }
      }
      case 'create_task': {
        const task = tasksRepo.createTask({
          title: String(args.title),
          note: args.note !== undefined ? String(args.note) : undefined,
          due_at: args.due_at !== undefined ? (args.due_at as string | null) : undefined,
          priority: args.priority as 0 | 1 | 2 | undefined
        })
        return { ok: true, data: task, mutates: true }
      }
      case 'update_task': {
        const id = String(args.id)
        const input: UpdateTaskInput = {}
        if (args.title !== undefined) input.title = String(args.title)
        if (args.note !== undefined) input.note = String(args.note)
        if (args.due_at !== undefined) input.due_at = args.due_at as string | null
        if (args.priority !== undefined) input.priority = args.priority as TaskPriority
        if (args.status !== undefined) input.status = args.status as TaskStatus
        const task = tasksRepo.updateTask(id, input)
        return { ok: true, data: task, mutates: true }
      }
      case 'complete_task': {
        const task = tasksRepo.completeTask(String(args.id))
        return { ok: true, data: task, mutates: true }
      }
      default:
        return { ok: false, error: `unknown tool: ${name}` }
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
