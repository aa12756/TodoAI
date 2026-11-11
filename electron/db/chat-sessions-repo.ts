import { randomUUID } from 'crypto'
import type {
  ChatSession,
  ChatSessionSummary,
  SaveChatSessionInput,
  UiChatMessage
} from '../../shared/ai'
import { SETTING_ACTIVE_CHAT_SESSION } from '../../shared/ai'
import { getDatabase } from './database'

const MAX_STORED_MESSAGES = 80

function nowIso(): string {
  return new Date().toISOString()
}

function messagesPayload(messages: UiChatMessage[]): UiChatMessage[] {
  return messages
    .filter((m) => m.content.trim() || m.thinking?.trim())
    .map(({ id, role, content, thinking }) => ({ id, role, content, thinking }))
}

function messagesPayloadJson(messages: UiChatMessage[]): string {
  return JSON.stringify(messagesPayload(messages))
}

function parseMessages(raw: string): UiChatMessage[] {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((m): m is Record<string, unknown> => Boolean(m && typeof m === 'object'))
      .map((m) => {
        const thinkingRaw = m.thinking
        let thinking: string | undefined
        if (typeof thinkingRaw === 'string') thinking = thinkingRaw
        else if (Array.isArray(thinkingRaw)) {
          thinking = thinkingRaw.map(String).join('')
        }
        return {
          id: typeof m.id === 'string' ? m.id : randomUUID(),
          role: m.role === 'user' || m.role === 'assistant' ? m.role : 'assistant',
          content: typeof m.content === 'string' ? m.content : '',
          thinking
        }
      })
  } catch {
    return []
  }
}

function rowToSummary(row: Record<string, unknown>): ChatSessionSummary {
  const updatedAt = row.updated_at as string
  const accessedRaw = row.accessed_at as string | undefined
  return {
    id: row.id as string,
    title: (row.title as string) || '',
    createdAt: row.created_at as string,
    updatedAt,
    accessedAt: accessedRaw?.trim() ? accessedRaw : updatedAt,
    totalTokens: Number(row.total_tokens) || 0,
    titleCustom: Number(row.title_custom ?? 0) === 1
  }
}

function getSetting(key: string): string | null {
  const row = getDatabase()
    .prepare('SELECT value FROM settings WHERE key = ?')
    .get(key) as { value?: string } | undefined
  return row?.value ?? null
}

function setSetting(key: string, value: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value)
}

export function listChatSessions(): ChatSessionSummary[] {
  const rows = getDatabase()
    .prepare('SELECT * FROM chat_sessions ORDER BY updated_at DESC')
    .all() as Record<string, unknown>[]
  return rows.map(rowToSummary)
}

export function getChatSession(id: string): ChatSession | null {
  const row = getDatabase()
    .prepare('SELECT * FROM chat_sessions WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined
  if (!row) return null
  return {
    ...rowToSummary(row),
    messages: parseMessages((row.messages_json as string) ?? '[]')
  }
}

export function getActiveChatSessionId(): string | null {
  return getSetting(SETTING_ACTIVE_CHAT_SESSION)
}

export function setActiveChatSessionId(id: string): void {
  setSetting(SETTING_ACTIVE_CHAT_SESSION, id)
}

function defaultTitle(localeHint: 'zh' | 'en' = 'zh'): string {
  return localeHint === 'zh' ? '新对话' : 'New chat'
}

export function createChatSession(
  messages: UiChatMessage[],
  title?: string,
  localeHint: 'zh' | 'en' = 'zh'
): ChatSession {
  const id = randomUUID()
  const now = nowIso()
  const trimmed = messages.slice(-MAX_STORED_MESSAGES)
  const resolvedTitle = title?.trim() || defaultTitle(localeHint)

  getDatabase()
    .prepare(
      `INSERT INTO chat_sessions (id, title, created_at, updated_at, accessed_at, total_tokens, title_custom, messages_json)
       VALUES (?, ?, ?, ?, ?, 0, 0, ?)`
    )
    .run(id, resolvedTitle, now, now, now, JSON.stringify(trimmed))

  setActiveChatSessionId(id)
  return {
    id,
    title: resolvedTitle,
    createdAt: now,
    updatedAt: now,
    accessedAt: now,
    totalTokens: 0,
    titleCustom: false,
    messages: trimmed
  }
}

export function saveChatSession(input: SaveChatSessionInput): ChatSession | null {
  const existing = getChatSession(input.id)
  if (!existing) return null

  const now = nowIso()
  const trimmed = messagesPayload(input.messages).slice(-MAX_STORED_MESSAGES)
  const title = input.title?.trim() || existing.title
  const addTokens = Math.max(0, input.addTokens ?? 0)
  const totalTokens = existing.totalTokens + addTokens
  const titleCustom =
    input.titleCustom === true ? 1 : input.titleCustom === false ? 0 : existing.titleCustom ? 1 : 0

  const messagesChanged = messagesPayloadJson(trimmed) !== messagesPayloadJson(existing.messages)
  const conversationActivity = messagesChanged || addTokens > 0
  const updatedAt = conversationActivity ? now : existing.updatedAt

  getDatabase()
    .prepare(
      `UPDATE chat_sessions
       SET title = ?, updated_at = ?, total_tokens = ?, title_custom = ?, messages_json = ?
       WHERE id = ?`
    )
    .run(title, updatedAt, totalTokens, titleCustom, JSON.stringify(trimmed), input.id)

  setActiveChatSessionId(input.id)

  return {
    ...existing,
    title,
    updatedAt,
    totalTokens,
    titleCustom: titleCustom === 1,
    messages: trimmed
  }
}

export function deleteChatSession(id: string): void {
  getDatabase().prepare('DELETE FROM chat_sessions WHERE id = ?').run(id)
  const active = getActiveChatSessionId()
  if (active === id) {
    const remaining = listChatSessions()
    if (remaining.length > 0) {
      setActiveChatSessionId(remaining[0].id)
    } else {
      getDatabase().prepare('DELETE FROM settings WHERE key = ?').run(SETTING_ACTIVE_CHAT_SESSION)
    }
  }
}

export function titleFromFirstUserMessage(messages: UiChatMessage[]): string | null {
  const user = messages.find((m) => m.role === 'user' && m.content.trim())
  if (!user) return null
  const t = user.content.trim().replace(/\s+/g, ' ')
  return t.length > 40 ? `${t.slice(0, 40)}…` : t
}

/** 首次启动：若无会话则创建；若有 sessionStorage 遗留则导入一条 */
export function bootstrapChatSessions(
  welcomeMessage: UiChatMessage,
  legacySessionJson?: string | null,
  localeHint: 'zh' | 'en' = 'zh'
): { sessions: ChatSessionSummary[]; active: ChatSession } {
  let sessions = listChatSessions()
  if (sessions.length === 0) {
    let seed: UiChatMessage[] = [welcomeMessage]
    if (legacySessionJson) {
      const legacy = parseMessages(legacySessionJson)
      if (legacy.length > 0) {
        seed = legacy
      }
    }
    const title = titleFromFirstUserMessage(seed) ?? defaultTitle(localeHint)
    const created = createChatSession(seed, title, localeHint)
    sessions = listChatSessions()
    return { sessions, active: created }
  }

  const activeId = getActiveChatSessionId()
  let active = activeId ? getChatSession(activeId) : null
  if (!active) {
    active = getChatSession(sessions[0].id)
    if (active) setActiveChatSessionId(active.id)
  }
  if (!active) {
    const created = createChatSession([welcomeMessage], defaultTitle(localeHint), localeHint)
    sessions = listChatSessions()
    return { sessions, active: created }
  }

  if (active.messages.length === 0) {
    active.messages = [welcomeMessage]
    saveChatSession({ id: active.id, messages: active.messages })
  }

  return { sessions, active }
}

