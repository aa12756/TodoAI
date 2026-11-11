import type { Locale } from '../../shared/locale'
import type { DailyBriefRecord } from '../../shared/daily-brief'
import { dailyBriefSentKey } from '../../shared/daily-brief'
import { saveDailyBriefRecord } from '../db/daily-brief-repo'
import { getAiSettings, getDailyBriefPreferences, getSetting, setSetting } from '../db/settings-repo'
import { getMainLocale } from '../main/locale-state'
import { listTasks } from '../db/tasks-repo'
import { emitDailyBriefUpdated } from './daily-brief-notify'
import { showTodoNotification } from './notification-service'

const NOTIFY_BODY_MAX = 240

export function dateKeyInTimezone(timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date())
  } catch {
    return new Intl.DateTimeFormat('en-CA').format(new Date())
  }
}

function hourInTimezone(timezone: string): number {
  try {
    const h = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false
    }).format(new Date())
    return Number(h)
  } catch {
    return new Date().getHours()
  }
}

function trimNotificationBody(text: string): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (oneLine.length <= NOTIFY_BODY_MAX) return oneLine
  return `${oneLine.slice(0, NOTIFY_BODY_MAX - 1)}…`
}

function buildTaskLines(locale: Locale): string[] {
  const today = listTasks('today')
  const overdue = listTasks('overdue')
  const lines: string[] = []

  if (locale === 'zh') {
    if (today.length) {
      lines.push(`今日 ${today.length} 项：`)
      for (const t of today.slice(0, 12)) {
        lines.push(`· ${t.title}`)
      }
      if (today.length > 12) lines.push(`…另有 ${today.length - 12} 项`)
    } else {
      lines.push('今日无截止任务。')
    }
    if (overdue.length) {
      lines.push(`逾期 ${overdue.length} 项：`)
      for (const t of overdue.slice(0, 8)) {
        lines.push(`· ${t.title}`)
      }
      if (overdue.length > 8) lines.push(`…另有 ${overdue.length - 8} 项`)
    }
  } else {
    if (today.length) {
      lines.push(`${today.length} due today:`)
      for (const t of today.slice(0, 12)) {
        lines.push(`· ${t.title}`)
      }
      if (today.length > 12) lines.push(`…+${today.length - 12} more`)
    } else {
      lines.push('Nothing due today.')
    }
    if (overdue.length) {
      lines.push(`${overdue.length} overdue:`)
      for (const t of overdue.slice(0, 8)) {
        lines.push(`· ${t.title}`)
      }
      if (overdue.length > 8) lines.push(`…+${overdue.length - 8} more`)
    }
  }

  return lines
}

async function fetchAiSummary(locale: Locale, timezone: string, taskBlock: string): Promise<string | null> {
  const { apiKey, baseUrl, model } = getAiSettings()
  if (!apiKey) return null

  const system =
    locale === 'zh'
      ? '你是个人待办助手。根据任务列表写一段不超过 2 句的早晨简报，积极简练，不要列表符号，不要编造任务。'
      : 'You are a personal todo assistant. Write at most 2 short motivational sentences from the task list. No bullets, no invented tasks.'

  const user =
    locale === 'zh'
      ? `时区 ${timezone}。任务概况：\n${taskBlock}\n请输出简报正文。`
      : `Timezone ${timezone}. Tasks:\n${taskBlock}\nReply with brief text only.`

  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.5,
        max_tokens: 120
      }),
      signal: AbortSignal.timeout(20_000)
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const content = data.choices?.[0]?.message?.content?.trim()
    return content ? content.replace(/\s+/g, ' ').trim() : null
  } catch {
    return null
  }
}

function wasBriefSent(dateKey: string): boolean {
  return getSetting(dailyBriefSentKey(dateKey)) === '1'
}

function markBriefSent(dateKey: string): void {
  setSetting(dailyBriefSentKey(dateKey), '1')
}

export interface SendDailyBriefResult {
  shown: boolean
  dateKey?: string
}

export async function sendDailyBrief(options?: { force?: boolean }): Promise<SendDailyBriefResult> {
  const prefs = getDailyBriefPreferences()
  if (!prefs.enabled && !options?.force) return { shown: false }

  const locale = getMainLocale()
  const { timezone } = getAiSettings()
  const dateKey = dateKeyInTimezone(timezone)

  if (!options?.force) {
    const hour = hourInTimezone(timezone)
    if (hour !== prefs.hour) return { shown: false }
    if (wasBriefSent(dateKey)) return { shown: false }
  }

  const lines = buildTaskLines(locale)
  const taskBlock = lines.join('\n')
  const aiLine = await fetchAiSummary(locale, timezone, taskBlock)

  const title = locale === 'zh' ? 'TodoAI 每日简报' : 'TodoAI daily brief'
  const fullBody = aiLine ? `${aiLine}\n\n${taskBlock}` : taskBlock
  const notificationBody = trimNotificationBody(fullBody)

  const record: DailyBriefRecord = {
    dateKey,
    createdAt: new Date().toISOString(),
    locale,
    aiSummary: aiLine,
    taskBlock,
    notificationBody
  }
  saveDailyBriefRecord(record)
  emitDailyBriefUpdated(dateKey)

  const shown = showTodoNotification({
    title,
    body: notificationBody,
    openDailyBrief: true,
    dailyBriefDateKey: dateKey
  })

  if (shown && !options?.force) {
    markBriefSent(dateKey)
  }

  return { shown, dateKey }
}

export function runDailyBriefTick(): void {
  const prefs = getDailyBriefPreferences()
  if (!prefs.enabled) return
  void sendDailyBrief()
}
