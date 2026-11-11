export const SETTING_REMINDER_ENABLED = 'reminder_enabled'
export const SETTING_REMINDER_MINUTES = 'reminder_minutes_before'

export const DEFAULT_REMINDER_ENABLED = true
export const DEFAULT_REMINDER_MINUTES = 30

export type ReminderSlot = 'before' | 'due' | 'overdue'

export function reminderFlagKey(taskId: string, slot: string): string {
  return `reminder_sent:${taskId}:${slot}`
}

export function parseReminderEnabled(value: string | null | undefined): boolean {
  if (value === '0' || value === 'false') return false
  if (value === '1' || value === 'true') return true
  return DEFAULT_REMINDER_ENABLED
}

export function parseReminderMinutes(value: string | null | undefined): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return DEFAULT_REMINDER_MINUTES
  return Math.min(Math.floor(n), 24 * 60)
}

export interface ReminderPreferences {
  enabled: boolean
  minutesBefore: number
}
