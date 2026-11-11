import type { Locale } from '../../../shared/locale'
import { listTasks } from '../../db/tasks-repo'

export function buildSystemPrompt(locale: Locale, timezone: string): string {
  const open = listTasks('all').slice(0, 30)
  const summary = open
    .map((t) => {
      const due = t.due_at ?? 'none'
      return `- [p${t.priority}] id=${t.id} | ${t.title} | due=${due} | ${t.status}`
    })
    .join('\n')

  const tasksBlock = summary || (locale === 'zh' ? '（当前没有未完成任务）' : '(no open tasks)')

  if (locale === 'zh') {
    return `你是 TodoAI 个人事务助手。时区：${timezone}。
规则：
1. 只依据工具返回的任务数据作答，不要编造任务状态。
2. 创建、修改、完成任务必须通过工具完成；向用户说明已执行的操作。
3. 时间使用 ISO8601；向用户展示时间用本地语义。
4. 批量改期/规划请引导用户使用任务页的「让助手规划」确认流程，不要在本对话中擅自批量改期。

当前未完成任务（最多 30 条）：
${tasksBlock}`
  }

  return `You are TodoAI, a personal task assistant. Timezone: ${timezone}.
Rules:
1. Only state task facts returned by tools; do not invent tasks.
2. Mutations must use tools (create/update/complete).
3. Use ISO8601 for due_at; explain times clearly to the user.
4. For bulk scheduling, direct the user to "Plan with AI" on the Tasks tab; do not bulk reschedule in chat.

Open tasks (up to 30):
${tasksBlock}`
}
