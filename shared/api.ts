import type {
  AiSettingsForm,
  AiSettingsPublic,
  AiStreamHandlers,
  ChatSession,
  ChatSessionSummary,
  SaveChatSessionInput,
  UiChatMessage
} from './ai'
import type { Locale } from './locale'
import type { DailyBriefPreferences, DailyBriefRecord, DailyBriefSummary } from './daily-brief'
import type { ReminderPreferences } from './reminder'
import type {
  ProposedTaskChange,
  ScheduleApplyResult,
  ScheduleSuggestion,
  StoredSchedulePlan,
  SuggestScheduleResult
} from './schedule'
import type { CloseWindowAction } from './settings'
import type { CreateTaskInput, Task, TaskFilter, UpdateTaskInput } from './types'

export type MutateResult<T> = { ok: true; task: T } | { ok: false; error: string }
export type VoidResult = { ok: true } | { ok: false; error: string }

export type AppSetLocaleResult = { ok: true } | { ok: false; error: string }

export type NotificationTestResult =
  | { ok: true }
  | { ok: false; error: string }

export type DailyBriefTestResult =
  | { ok: true; dateKey?: string }
  | { ok: false; error: string }

export interface TodoApi {
  app: {
    setLocale: (locale: Locale) => Promise<AppSetLocaleResult>
  }
  notification: {
    test: () => Promise<NotificationTestResult>
    testDailyBrief: () => Promise<DailyBriefTestResult>
  }
  dailyBrief: {
    list: () => Promise<DailyBriefSummary[]>
    get: (dateKey: string) => Promise<DailyBriefRecord | null>
  }
  settings: {
    getCloseAction: () => Promise<CloseWindowAction>
    setCloseAction: (action: CloseWindowAction) => Promise<VoidResult>
    resetCloseAction: () => Promise<{ ok: true }>
    getReminder: () => Promise<ReminderPreferences>
    setReminder: (prefs: ReminderPreferences) => Promise<VoidResult>
    getDailyBrief: () => Promise<DailyBriefPreferences>
    setDailyBrief: (prefs: DailyBriefPreferences) => Promise<VoidResult>
    getAi: () => Promise<AiSettingsPublic>
    setAi: (form: AiSettingsForm) => Promise<VoidResult>
  }
  ai: {
    chatStream: (history: UiChatMessage[], handlers: AiStreamHandlers) => Promise<void>
    suggestSchedule: () => Promise<SuggestScheduleResult>
  }
  schedule: {
    getLast: () => Promise<StoredSchedulePlan | null>
    saveState: (suggestion: ScheduleSuggestion, selectedIds: string[]) => Promise<VoidResult>
    apply: (changes: ProposedTaskChange[]) => Promise<ScheduleApplyResult>
  }
  chat: {
    bootstrap: (legacyJson?: string | null) => Promise<{
      sessions: ChatSessionSummary[]
      active: ChatSession
    }>
    list: () => Promise<ChatSessionSummary[]>
    get: (id: string) => Promise<ChatSession | null>
    create: (title?: string) => Promise<ChatSession>
    save: (input: SaveChatSessionInput) => Promise<ChatSession | null>
    delete: (id: string) => Promise<VoidResult>
    setActive: (id: string) => Promise<{ ok: true }>
  }
  events: {
    onNotificationClicked: (callback: (taskId: string) => void) => () => void
    onTasksChanged: (callback: () => void) => () => void
    onDailyBriefUpdated: (callback: (dateKey: string) => void) => () => void
    onOpenDailyBrief: (callback: (dateKey: string) => void) => () => void
  }
  tasks: {
    list: (filter?: TaskFilter) => Promise<Task[]>
    get: (id: string) => Promise<Task | null>
    create: (input: CreateTaskInput) => Promise<MutateResult<Task>>
    update: (id: string, input: UpdateTaskInput) => Promise<MutateResult<Task>>
    delete: (id: string) => Promise<VoidResult>
    complete: (id: string) => Promise<MutateResult<Task>>
  }
}
