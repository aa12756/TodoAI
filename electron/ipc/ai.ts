import { ipcMain } from 'electron'
import type { UiChatMessage } from '../../shared/ai'
import { getMainLocale } from '../main/locale-state'
import { runAssistantChatStream } from '../services/ai/client'

function isUiMessage(value: unknown): value is UiChatMessage {
  if (!value || typeof value !== 'object') return false
  const m = value as UiChatMessage
  return (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
}

export function registerAiIpc(): void {
  ipcMain.handle('ai:chat-stream', async (event, history: unknown) => {
    try {
      if (!Array.isArray(history)) {
        event.sender.send('ai:stream', {
          type: 'error',
          message: 'invalid history',
          code: 'API'
        })
        return { ok: false as const }
      }
      const messages = history.filter(isUiMessage).slice(-40)
      if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
        event.sender.send('ai:stream', {
          type: 'error',
          message: '需要一条用户消息',
          code: 'API'
        })
        return { ok: false as const }
      }

      await runAssistantChatStream(
        messages,
        (payload) => {
          if (!event.sender.isDestroyed()) event.sender.send('ai:stream', payload)
        },
        getMainLocale()
      )
      return { ok: true as const }
    } catch (err) {
      const e = err as Error & { code?: string }
      if (!event.sender.isDestroyed()) {
        event.sender.send('ai:stream', {
          type: 'error',
          message: e.message,
          code: e.code ?? 'API'
        })
      }
      return { ok: false as const }
    }
  })
}
