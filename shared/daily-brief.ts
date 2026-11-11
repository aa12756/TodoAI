import type { Locale } from './locale'

export const SETTING_DAILY_BRIEF_ENABLED = 'daily_brief_enabled'
export const SETTING_DAILY_BRIEF_HOUR = 'daily_brief_hour'
export const SETTING_DAILY_BRIEF_INDEX = 'daily_brief_index'

export const MAX_DAILY_BRIEF_HISTORY = 90

export function dailyBriefEntryKey(dateKey: string): string {
  return `daily_brief_entry:${dateKey}`
}

export const DEFAULT_DAILY_BRIEF_ENABLED = false
export const DEFAULT_DAILY_BRIEF_HOUR = 8

export function dailyBriefSentKey(dateKey: string): string {
  return `daily_brief_sent:${dateKey}`
}

export function parseDailyBriefEnabled(value: string | null | undefined): boolean {
  if (value === '1' || value === 'true') return true
  if (value === '0' || value === 'false') return false
  return DEFAULT_DAILY_BRIEF_ENABLED
}

export function parseDailyBriefHour(value: string | null | undefined): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return DEFAULT_DAILY_BRIEF_HOUR
  const h = Math.floor(n)
  if (h < 0) return 0
  if (h > 23) return 23
  return h
}

export interface DailyBriefPreferences {
  enabled: boolean
  hour: number
}

export interface DailyBriefRecord {
  dateKey: string
  createdAt: string
  locale: Locale
  aiSummary: string | null
  taskBlock: string
  notificationBody: string
}

export interface DailyBriefSummary {
  dateKey: string
  createdAt: string
}
