import type { TaskPriority, TaskStatus } from './types'

/** 单条待确认的任务变更（来自 AI，应用前须用户勾选） */
export interface ProposedTaskChange {
  id: string
  title?: string
  note?: string
  due_at?: string | null
  priority?: TaskPriority
  status?: TaskStatus
  /** 模型给出的调整理由 */
  reason?: string
}

export interface ScheduleSuggestion {
  /** 建议的执行顺序（任务 id，仅展示，不自动写库） */
  ordered_ids: string[]
  /** 总体规划说明 */
  notes: string
  proposed_changes: ProposedTaskChange[]
}

export type SuggestScheduleResult =
  | { ok: true; suggestion: ScheduleSuggestion }
  | { ok: false; error: string; code?: 'NO_API_KEY' | 'NETWORK' | 'API' | 'PARSE' }

export type ScheduleApplyResult =
  | { ok: true; updatedCount: number; errors?: string[] }
  | { ok: false; error: string; errors?: string[] }

export const SETTING_SCHEDULE_LAST_PLAN = 'schedule_last_plan'

/** 持久化在 settings 表中的上一次规划 */
export interface StoredSchedulePlan {
  suggestion: ScheduleSuggestion
  /** 用户勾选的建议项 id（proposed_changes 的 id 字段） */
  selectedIds: string[]
  savedAt: string
}
