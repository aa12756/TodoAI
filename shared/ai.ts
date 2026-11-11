export const SETTING_AI_API_KEY = 'deepseek_api_key'
export const SETTING_AI_BASE_URL = 'deepseek_base_url'
export const SETTING_AI_MODEL = 'deepseek_model'
export const SETTING_TIMEZONE = 'timezone'

export const DEFAULT_AI_BASE_URL = 'https://api.deepseek.com'
export const DEFAULT_AI_MODEL = 'deepseek-chat'
export const DEFAULT_TIMEZONE = 'Asia/Shanghai'

export const API_KEY_MASK = '••••••••'

export const CHAT_STORAGE_KEY = 'todoai.chat.v1'

export interface AiSettings {
  apiKey: string
  baseUrl: string
  model: string
  timezone: string
}

export interface AiSettingsForm {
  apiKey: string
  baseUrl: string
  model: string
  timezone: string
}

export interface AiSettingsPublic {
  hasApiKey: boolean
  apiKeyMasked: string
  baseUrl: string
  model: string
  timezone: string
}

export interface UiChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** 本条助手消息附带的思考/工具过程（完成后展示） */
  thinking?: string
}

export interface ChatSessionSummary {
  id: string
  title: string
  createdAt: string
  /** 该对话内最后一次消息往来时间（侧栏「最近互动」；仅发消息/流式完成时更新） */
  updatedAt: string
  /** 预留：进入会话时间（当前未用于展示） */
  accessedAt: string
  totalTokens: number
  /** 用户手动重命名后为 true，避免自动保存用首条消息覆盖标题 */
  titleCustom: boolean
}

export interface ChatSession extends ChatSessionSummary {
  messages: UiChatMessage[]
}

export interface SaveChatSessionInput {
  id: string
  messages: UiChatMessage[]
  title?: string
  addTokens?: number
  titleCustom?: boolean
}

export const SETTING_ACTIVE_CHAT_SESSION = 'active_chat_session_id'

export type AiStreamServerEvent =
  | { type: 'thinking'; text: string }
  | { type: 'delta'; text: string }
  | { type: 'done'; tasksChanged: boolean; totalTokens?: number }
  | { type: 'error'; message: string; code?: 'NO_API_KEY' | 'NETWORK' | 'API' }

export type AiChatResult =
  | { ok: true; reply: string; tasksChanged: boolean }
  | { ok: false; error: string; code?: 'NO_API_KEY' | 'NETWORK' | 'API' }

export interface AiStreamHandlers {
  onThinking: (line: string) => void
  onDelta: (chunk: string) => void
  onDone: (tasksChanged: boolean, totalTokens?: number) => void
  onError: (error: string, code?: 'NO_API_KEY' | 'NETWORK' | 'API') => void
}
