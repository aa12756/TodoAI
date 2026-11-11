import { ipcMain } from 'electron'
import type { ProposedTaskChange } from '../../shared/schedule'
import { getMainLocale } from '../main/locale-state'
import { notifyTasksChanged } from '../main/notify'
import { suggestScheduleSafe } from '../services/ai/suggest-schedule'
import {
  getStoredSchedulePlan,
  saveStoredSchedulePlan
} from '../db/schedule-plan-repo'
import { applyScheduleChanges } from '../services/schedule-apply'
import type { ScheduleSuggestion } from '../../shared/schedule'

function isProposedChange(value: unknown): value is ProposedTaskChange {
  if (!value || typeof value !== 'object') return false
  const c = value as ProposedTaskChange
  return typeof c.id === 'string' && c.id.length > 0
}

function isScheduleSuggestion(value: unknown): value is ScheduleSuggestion {
  if (!value || typeof value !== 'object') return false
  const s = value as ScheduleSuggestion
  return Array.isArray(s.ordered_ids) && Array.isArray(s.proposed_changes) && typeof s.notes === 'string'
}

export function registerScheduleIpc(): void {
  ipcMain.handle('ai:suggestSchedule', async () => {
    const result = await suggestScheduleSafe(getMainLocale())
    if (result.ok) {
      saveStoredSchedulePlan(
        result.suggestion,
        result.suggestion.proposed_changes.map((c) => c.id)
      )
    }
    return result
  })

  ipcMain.handle('schedule:getLast', () => getStoredSchedulePlan())

  ipcMain.handle('schedule:saveState', (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      return { ok: false as const, error: 'invalid payload' }
    }
    const p = payload as { suggestion?: unknown; selectedIds?: unknown }
    if (!isScheduleSuggestion(p.suggestion) || !Array.isArray(p.selectedIds)) {
      return { ok: false as const, error: 'invalid payload' }
    }
    saveStoredSchedulePlan(
      p.suggestion,
      p.selectedIds.map(String)
    )
    return { ok: true as const }
  })

  ipcMain.handle('schedule:apply', (_event, changes: unknown) => {
    if (!Array.isArray(changes) || changes.length === 0) {
      return { ok: false as const, error: 'no changes' }
    }
    const approved = changes.filter(isProposedChange)
    if (approved.length === 0) {
      return { ok: false as const, error: 'invalid changes' }
    }
    const { updatedCount, errors } = applyScheduleChanges(approved)
    if (updatedCount > 0) notifyTasksChanged()
    if (errors.length > 0 && updatedCount === 0) {
      return { ok: false as const, error: errors.join('; '), errors }
    }
    return { ok: true as const, updatedCount, errors: errors.length ? errors : undefined }
  })
}
