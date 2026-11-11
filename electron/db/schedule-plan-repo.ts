import type { ScheduleSuggestion, StoredSchedulePlan } from '../../shared/schedule'
import { SETTING_SCHEDULE_LAST_PLAN } from '../../shared/schedule'
import { getSetting, setSetting } from './settings-repo'

function nowIso(): string {
  return new Date().toISOString()
}

function parseStored(raw: string | null): StoredSchedulePlan | null {
  if (!raw?.trim()) return null
  try {
    const data = JSON.parse(raw) as StoredSchedulePlan
    if (!data?.suggestion || typeof data.suggestion !== 'object') return null
    const s = data.suggestion as ScheduleSuggestion
    if (!Array.isArray(s.ordered_ids) || !Array.isArray(s.proposed_changes)) return null
    if (typeof s.notes !== 'string') return null
    return {
      suggestion: s,
      selectedIds: Array.isArray(data.selectedIds) ? data.selectedIds.map(String) : [],
      savedAt: typeof data.savedAt === 'string' ? data.savedAt : nowIso()
    }
  } catch {
    return null
  }
}

export function getStoredSchedulePlan(): StoredSchedulePlan | null {
  return parseStored(getSetting(SETTING_SCHEDULE_LAST_PLAN))
}

export function saveStoredSchedulePlan(
  suggestion: ScheduleSuggestion,
  selectedIds: string[]
): StoredSchedulePlan {
  const stored: StoredSchedulePlan = {
    suggestion,
    selectedIds,
    savedAt: nowIso()
  }
  setSetting(SETTING_SCHEDULE_LAST_PLAN, JSON.stringify(stored))
  return stored
}

export function clearStoredSchedulePlan(): void {
  setSetting(SETTING_SCHEDULE_LAST_PLAN, '')
}
