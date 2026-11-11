import { ipcMain } from 'electron'
import type { SaveChatSessionInput, UiChatMessage } from '../../shared/ai'
import { getMainLocale } from '../main/locale-state'
import * as repo from '../db/chat-sessions-repo'

function welcomeForLocale(): UiChatMessage {
  const locale = getMainLocale()
  return {
    id: 'welcome',
    role: 'assistant',
    content:
      locale === 'zh'
        ? '你好，我是 TodoAI 助手。可以说「帮我添加一条明天交报告的任务」或「列出逾期事项」。'
        : 'Hi! I can add tasks, list overdue items, or mark tasks done—just ask.'
  }
}

export function registerChatIpc(): void {
  ipcMain.handle('chat:bootstrap', (_event, legacyJson?: string | null) => {
    const locale = getMainLocale()
    return repo.bootstrapChatSessions(welcomeForLocale(), legacyJson ?? null, locale)
  })

  ipcMain.handle('chat:list', () => repo.listChatSessions())

  ipcMain.handle('chat:get', (_event, id: string) => repo.getChatSession(id))

  ipcMain.handle('chat:create', (_event, title?: string) => {
    const locale = getMainLocale()
    return repo.createChatSession([welcomeForLocale()], title, locale)
  })

  ipcMain.handle('chat:save', (_event, input: SaveChatSessionInput) => {
    return repo.saveChatSession(input)
  })

  ipcMain.handle('chat:delete', (_event, id: string) => {
    try {
      repo.deleteChatSession(id)
      return { ok: true as const }
    } catch (e) {
      return { ok: false as const, error: (e as Error).message }
    }
  })

  ipcMain.handle('chat:setActive', (_event, id: string) => {
    repo.setActiveChatSessionId(id)
    return { ok: true as const }
  })
}
