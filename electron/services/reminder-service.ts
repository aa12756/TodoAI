import type { Task } from '../../shared/types'
import type { Locale } from '../../shared/locale'
import { getMainLocale } from '../main/locale-state'
import { getReminderPreferences } from '../db/settings-repo'
import { listOpenTasksWithDue, touchTaskNotified } from '../db/tasks-repo'
import { markReminderSent, wasReminderSent } from '../db/reminder-flags'
import { runDailyBriefTick } from './daily-brief-service'
import { showTodoNotification } from './notification-service'

const TICK_MS = 60_000

let intervalId: ReturnType<typeof setInterval> | null = null

function formatDue(locale: Locale, iso: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')
  } catch {
    return iso
  }
}

function todayKey(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function notifyForTask(
  locale: Locale,
  task: Task,
  kind: 'before' | 'due' | 'overdue'
): void {
  const dueText = formatDue(locale, task.due_at!)
  let title: string
  let body: string

  if (locale === 'zh') {
    if (kind === 'before') {
      title = '即将到期'
      body = `「${task.title}」将于 ${dueText} 截止`
    } else if (kind === 'due') {
      title = '到达截止时间'
      body = `「${task.title}」已到点（${dueText}）`
    } else {
      title = '任务已逾期'
      body = `「${task.title}」已逾期（截止 ${dueText}）`
    }
  } else {
    if (kind === 'before') {
      title = 'Due soon'
      body = `"${task.title}" is due at ${dueText}`
    } else if (kind === 'due') {
      title = 'Due now'
      body = `"${task.title}" is due now (${dueText})`
    } else {
      title = 'Overdue'
      body = `"${task.title}" is overdue (was ${dueText})`
    }
  }

  const shown = showTodoNotification({ title, body, taskId: task.id })
  if (shown) {
    touchTaskNotified(task.id)
  }
}

function evaluateTask(task: Task, now: number, minutesBefore: number, locale: Locale): void {
  if (!task.due_at) return

  const dueMs = new Date(task.due_at).getTime()
  if (Number.isNaN(dueMs)) return

  const beforeMs = dueMs - minutesBefore * 60_000

  if (minutesBefore > 0 && now >= beforeMs && now < dueMs) {
    if (!wasReminderSent(task.id, 'before')) {
      notifyForTask(locale, task, 'before')
      markReminderSent(task.id, 'before')
    }
  }

  if (now >= dueMs) {
    if (!wasReminderSent(task.id, 'due')) {
      notifyForTask(locale, task, 'due')
      markReminderSent(task.id, 'due')
    } else {
      const daySlot = `overdue:${todayKey()}`
      if (now > dueMs + 60_000 && !wasReminderSent(task.id, daySlot)) {
        notifyForTask(locale, task, 'overdue')
        markReminderSent(task.id, daySlot)
      }
    }
  }
}

export function runReminderTick(): void {
  const prefs = getReminderPreferences()
  if (prefs.enabled) {
    const locale = getMainLocale()
    const now = Date.now()
    const tasks = listOpenTasksWithDue()

    for (const task of tasks) {
      evaluateTask(task, now, prefs.minutesBefore, locale)
    }
  }

  runDailyBriefTick()
}

export function startReminderService(): void {
  stopReminderService()
  runReminderTick()
  intervalId = setInterval(() => runReminderTick(), TICK_MS)
}

export function stopReminderService(): void {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}
