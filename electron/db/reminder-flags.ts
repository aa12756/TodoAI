import { reminderFlagKey } from '../../shared/reminder'
import { deleteSettingsByPrefix, getSetting, setSetting } from './settings-repo'

export function wasReminderSent(taskId: string, slot: string): boolean {
  return getSetting(reminderFlagKey(taskId, slot)) === '1'
}

export function markReminderSent(taskId: string, slot: string): void {
  setSetting(reminderFlagKey(taskId, slot), '1')
}

export function clearReminderFlags(taskId: string): void {
  deleteSettingsByPrefix(`reminder_sent:${taskId}:`)
}
