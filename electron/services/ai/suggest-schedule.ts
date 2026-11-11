import type { ScheduleSuggestion, ProposedTaskChange, SuggestScheduleResult } from '../../../shared/schedule'
import type { Locale } from '../../../shared/locale'
import { listTasks } from '../../db/tasks-repo'
import { getAiSettings } from '../../db/settings-repo'
import { getMainLocale } from '../../main/locale-state'

const SUGGEST_SCHEMA_HINT = `{
  "ordered_ids": ["task-id", "..."],
  "notes": "string",
  "proposed_changes": [
    {
      "id": "task-id",
      "due_at": "ISO8601 or null",
      "priority": 0,
      "status": "open",
      "reason": "why this change"
    }
  ]
}`

function buildSuggestPrompt(locale: Locale, timezone: string): string {
  const open = listTasks('all')
  const lines = open.map(
    (t) =>
      `- id=${t.id} | p${t.priority} | ${t.title} | due=${t.due_at ?? 'none'} | note=${t.note.slice(0, 80)}`
  )
  const block = lines.length ? lines.join('\n') : locale === 'zh' ? '（无 open 任务）' : '(no open tasks)'

  if (locale === 'zh') {
    return `你是日程规划助手。时区：${timezone}。
只根据下列真实任务 id 规划，不要编造 id。
输出必须是单个 JSON 对象，格式如下（不要 markdown 代码块）：
${SUGGEST_SCHEMA_HINT}

规则：
1. ordered_ids：建议处理顺序，仅包含下列 open 任务的 id。
2. notes：中文，说明本周/近期安排思路（3–8 句）。
3. proposed_changes：仅包含需要调整的项；每项必须有 id 和 reason；可含 due_at、priority(0-2)、status(open/done)；不要改 title 除非必要。
4. 若无需改截止/优先级，proposed_changes 可为空数组。

当前 open 任务：
${block}`
  }

  return `You are a schedule planner. Timezone: ${timezone}.
Use only real task ids below. Reply with one JSON object only (no markdown fence):
${SUGGEST_SCHEMA_HINT}

Rules:
1. ordered_ids: suggested work order using ids below.
2. notes: brief plan in English.
3. proposed_changes: only tasks needing edits; each needs id + reason; optional due_at, priority 0-2, status.
4. proposed_changes may be [] if nothing to change.

Open tasks:
${block}`
}

function coerceSuggestion(
  raw: unknown,
  validIds: Set<string>,
  locale: Locale
): ScheduleSuggestion | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  const orderedRaw = obj.ordered_ids
  const notes = typeof obj.notes === 'string' ? obj.notes.trim() : ''
  const changesRaw = obj.proposed_changes

  const ordered_ids = Array.isArray(orderedRaw)
    ? orderedRaw.map(String).filter((id) => validIds.has(id))
    : []

  const proposed_changes: ProposedTaskChange[] = []
  if (Array.isArray(changesRaw)) {
    for (const item of changesRaw) {
      if (!item || typeof item !== 'object') continue
      const c = item as Record<string, unknown>
      const id = typeof c.id === 'string' ? c.id : ''
      if (!id || !validIds.has(id)) continue
      const change: ProposedTaskChange = {
        id,
        reason: typeof c.reason === 'string' ? c.reason : undefined
      }
      if (typeof c.title === 'string') change.title = c.title
      if (typeof c.note === 'string') change.note = c.note
      if (c.due_at === null) change.due_at = null
      else if (typeof c.due_at === 'string') change.due_at = c.due_at
      if (c.priority === 0 || c.priority === 1 || c.priority === 2) change.priority = c.priority
      if (c.status === 'open' || c.status === 'done') change.status = c.status
      const hasField =
        change.title !== undefined ||
        change.note !== undefined ||
        change.due_at !== undefined ||
        change.priority !== undefined ||
        change.status !== undefined
      if (hasField) proposed_changes.push(change)
    }
  }

  return {
    ordered_ids,
    notes: notes || (locale === 'zh' ? '（无说明）' : '(no notes)'),
    proposed_changes
  }
}

export async function runSuggestSchedule(locale: Locale = getMainLocale()): Promise<ScheduleSuggestion> {
  const { apiKey, baseUrl, model, timezone } = getAiSettings()
  if (!apiKey) {
    throw Object.assign(new Error('未配置 API Key'), { code: 'NO_API_KEY' as const })
  }

  const open = listTasks('all')
  const validIds = new Set(open.map((t) => t.id))

  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildSuggestPrompt(locale, timezone) },
          {
            role: 'user',
            content:
              locale === 'zh'
                ? '请根据当前 open 任务给出规划 JSON。'
                : 'Return the schedule planning JSON for current open tasks.'
          }
        ],
        temperature: 0.35,
        response_format: { type: 'json_object' }
      })
    })
  } catch {
    throw Object.assign(new Error('网络请求失败'), { code: 'NETWORK' as const })
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
    error?: { message?: string }
  }
  if (!res.ok) {
    const msg = data.error?.message ?? `HTTP ${res.status}`
    throw Object.assign(new Error(msg), { code: 'API' as const })
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw Object.assign(new Error('模型未返回内容'), { code: 'PARSE' as const })

  let parsed: unknown
  try {
    parsed = JSON.parse(content) as unknown
  } catch {
    throw Object.assign(new Error('无法解析规划 JSON'), { code: 'PARSE' as const })
  }

  const suggestion = coerceSuggestion(parsed, validIds, locale)
  if (!suggestion) throw Object.assign(new Error('规划 JSON 结构无效'), { code: 'PARSE' as const })

  return suggestion
}

export async function suggestScheduleSafe(
  locale: Locale = getMainLocale()
): Promise<SuggestScheduleResult> {
  try {
    const suggestion = await runSuggestSchedule(locale)
    return { ok: true, suggestion }
  } catch (err) {
    const e = err as Error & { code?: 'NO_API_KEY' | 'NETWORK' | 'API' | 'PARSE' }
    return {
      ok: false,
      error: e.message,
      code: e.code ?? 'API'
    }
  }
}
