import {
  MAX_DAILY_BRIEF_HISTORY,
  SETTING_DAILY_BRIEF_INDEX,
  dailyBriefEntryKey,
  type DailyBriefRecord,
  type DailyBriefSummary
} from '../../shared/daily-brief'
import { deleteSettingsByPrefix, getSetting, setSetting } from './settings-repo'

function nowIso(): string {
  return new Date().toISOString()
}

function parseRecord(raw: string | null): DailyBriefRecord | null {
  if (!raw?.trim()) return null
  try {
    const data = JSON.parse(raw) as DailyBriefRecord
    if (typeof data.dateKey !== 'string' || typeof data.taskBlock !== 'string') return null
    return {
      dateKey: data.dateKey,
      createdAt: typeof data.createdAt === 'string' ? data.createdAt : nowIso(),
      locale: data.locale === 'en' ? 'en' : 'zh',
      aiSummary: typeof data.aiSummary === 'string' ? data.aiSummary : null,
      taskBlock: data.taskBlock,
      notificationBody:
        typeof data.notificationBody === 'string' ? data.notificationBody : data.taskBlock
    }
  } catch {
    return null
  }
}

function readIndex(): string[] {
  const raw = getSetting(SETTING_DAILY_BRIEF_INDEX)
  if (!raw?.trim()) return []
  try {
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr.map(String).filter(Boolean)
  } catch {
    return []
  }
}

function writeIndex(keys: string[]): void {
  setSetting(SETTING_DAILY_BRIEF_INDEX, JSON.stringify(keys.slice(0, MAX_DAILY_BRIEF_HISTORY)))
}

function trimOverflowIndex(keys: string[]): void {
  const drop = keys.slice(MAX_DAILY_BRIEF_HISTORY)
  for (const k of drop) {
    setSetting(dailyBriefEntryKey(k), '')
  }
}

export function saveDailyBriefRecord(record: DailyBriefRecord): void {
  setSetting(dailyBriefEntryKey(record.dateKey), JSON.stringify(record))
  const prev = readIndex().filter((k) => k !== record.dateKey)
  const next = [record.dateKey, ...prev]
  trimOverflowIndex(next)
  writeIndex(next)
}

export function getDailyBriefRecord(dateKey: string): DailyBriefRecord | null {
  return parseRecord(getSetting(dailyBriefEntryKey(dateKey)))
}

export function listDailyBriefSummaries(): DailyBriefSummary[] {
  const keys = readIndex()
  const out: DailyBriefSummary[] = []
  for (const dateKey of keys) {
    const rec = getDailyBriefRecord(dateKey)
    if (rec) {
      out.push({ dateKey: rec.dateKey, createdAt: rec.createdAt })
    }
  }
  return out
}

export function clearAllDailyBriefs(): void {
  const keys = readIndex()
  for (const k of keys) {
    setSetting(dailyBriefEntryKey(k), '')
  }
  setSetting(SETTING_DAILY_BRIEF_INDEX, '[]')
  deleteSettingsByPrefix('daily_brief_entry:')
}
