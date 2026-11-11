import type { AiStreamServerEvent, UiChatMessage } from '../../../shared/ai'
import type { Locale } from '../../../shared/locale'
import { getAiSettings } from '../../db/settings-repo'
import { getMainLocale } from '../../main/locale-state'
import { notifyTasksChanged } from '../../main/notify'
import { buildSystemPrompt } from './prompts'
import { TOOL_DEFINITIONS, executeTool } from './tools'

type ApiMessage =
  | { role: 'system' | 'user' | 'assistant'; content: string }
  | {
      role: 'assistant'
      content: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
    }
  | { role: 'tool'; tool_call_id: string; content: string }

const MAX_TOOL_ROUNDS = 8

type Emit = (event: AiStreamServerEvent) => void

interface CompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: Array<{
        id: string
        type: 'function'
        function: { name: string; arguments: string }
      }>
    }
  }>
  usage?: { total_tokens?: number }
  error?: { message?: string }
}

function toolThinkingLine(locale: Locale, name: string, args: Record<string, unknown>): string {
  if (locale === 'zh') {
    return `调用工具 ${name}（${JSON.stringify(args)}）`
  }
  return `Tool ${name} (${JSON.stringify(args)})`
}

function usageTokens(data: CompletionResponse | { usage?: { total_tokens?: number } }): number {
  return data.usage?.total_tokens ?? 0
}

async function postChat(messages: ApiMessage[]): Promise<CompletionResponse> {
  const { apiKey, baseUrl, model } = getAiSettings()
  if (!apiKey) {
    throw Object.assign(new Error('未配置 API Key'), { code: 'NO_API_KEY' as const })
  }

  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.6,
        stream: false
      })
    })
  } catch {
    throw Object.assign(new Error('网络请求失败'), { code: 'NETWORK' as const })
  }

  const data = (await res.json()) as CompletionResponse
  if (!res.ok) {
    const msg = data.error?.message ?? `HTTP ${res.status}`
    throw Object.assign(new Error(msg), { code: 'API' as const })
  }
  return data
}

async function streamCompletion(
  messages: ApiMessage[],
  emit: Emit
): Promise<{ text: string; totalTokens: number }> {
  const { apiKey, baseUrl, model } = getAiSettings()
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.6,
        stream: true,
        stream_options: { include_usage: true }
      })
    })
  } catch {
    throw Object.assign(new Error('网络请求失败'), { code: 'NETWORK' as const })
  }

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => ({}))) as CompletionResponse
    const msg = data.error?.message ?? `HTTP ${res.status}`
    throw Object.assign(new Error(msg), { code: 'API' as const })
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let text = ''
  let streamTokens = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (data === '[DONE]') continue
      try {
        const json = JSON.parse(data) as {
          choices?: Array<{
            delta?: { content?: string; reasoning_content?: string }
          }>
          usage?: { total_tokens?: number }
        }
        if (json.usage?.total_tokens) streamTokens = json.usage.total_tokens
        const delta = json.choices?.[0]?.delta
        const reasoning = delta?.reasoning_content
        if (reasoning) {
          emit({ type: 'thinking', text: reasoning })
        }
        const chunk = delta?.content
        if (chunk) {
          text += chunk
          emit({ type: 'delta', text: chunk })
        }
      } catch {
        /* ignore partial json */
      }
    }
  }

  return { text, totalTokens: streamTokens }
}

export async function runAssistantChatStream(
  history: UiChatMessage[],
  emit: Emit,
  locale: Locale = getMainLocale()
): Promise<{ tasksChanged: boolean; totalTokens: number }> {
  const { timezone } = getAiSettings()
  const messages: ApiMessage[] = [
    { role: 'system', content: buildSystemPrompt(locale, timezone) },
    ...history.map((m) => ({ role: m.role, content: m.content }))
  ]

  let tasksChanged = false
  let totalTokens = 0

  emit({
    type: 'thinking',
    text: (locale === 'zh' ? '正在分析任务与上下文…' : 'Analyzing tasks and context…') + '\n'
  })

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const data = await postChat(messages)
    totalTokens += usageTokens(data)
    const msg = data.choices?.[0]?.message
    if (!msg) throw new Error('模型未返回内容')

    if (msg.tool_calls?.length) {
      messages.push({
        role: 'assistant',
        content: msg.content ?? '',
        tool_calls: msg.tool_calls
      })

      for (const call of msg.tool_calls) {
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(call.function.arguments) as Record<string, unknown>
        } catch {
          args = {}
        }
        emit({ type: 'thinking', text: `${toolThinkingLine(locale, call.function.name, args)}\n` })
        const result = executeTool(call.function.name, args)
        if (result.ok && result.mutates) tasksChanged = true
        emit({
          type: 'thinking',
          text:
            (locale === 'zh'
              ? `工具 ${call.function.name} 完成：${result.ok ? '成功' : result.error}`
              : `Tool ${call.function.name}: ${result.ok ? 'ok' : result.error}`) + '\n'
        })
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result)
        })
      }
      continue
    }

    emit({
      type: 'thinking',
      text: (locale === 'zh' ? '正在生成回复…' : 'Generating response…') + '\n'
    })

    const streamed = await streamCompletion(messages, emit)
    totalTokens += streamed.totalTokens
    if (!streamed.text.trim() && !(msg.content?.trim())) {
      emit({
        type: 'delta',
        text: locale === 'zh' ? '（无文本回复）' : '(empty reply)'
      })
    } else if (!streamed.text.trim() && msg.content?.trim()) {
      const full = msg.content.trim()
      const step = 16
      for (let i = 0; i < full.length; i += step) {
        emit({ type: 'delta', text: full.slice(i, i + step) })
      }
    }

    if (tasksChanged) notifyTasksChanged()
    emit({ type: 'done', tasksChanged, totalTokens: totalTokens || undefined })
    return { tasksChanged, totalTokens }
  }

  if (tasksChanged) notifyTasksChanged()
  throw new Error(locale === 'zh' ? '工具调用次数过多' : 'Too many tool rounds')
}
