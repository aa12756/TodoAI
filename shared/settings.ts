export type CloseWindowAction = 'ask' | 'minimize' | 'quit'

export const SETTING_CLOSE_WINDOW_ACTION = 'close_window_action'
export const DEFAULT_CLOSE_WINDOW_ACTION: CloseWindowAction = 'ask'

export function parseCloseWindowAction(value: string | null | undefined): CloseWindowAction {
  if (value === 'minimize' || value === 'quit' || value === 'ask') return value
  return DEFAULT_CLOSE_WINDOW_ACTION
}
