import { tools as toolRegistry } from '../../mcp'
import type { ChatMessage } from '../../types'
import { formatPromptWithContext, getModelNameFromSettings } from '../../utils'
import { api } from '..'
import { buildWikiSystemText } from './system'
import type {
  NormalizedToolCall,
  NormalizedTurn,
  ProviderAdapter,
  ToolResultPayload,
} from './types'

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

interface OpenAIToolResponse {
  choices?: {
    message: {
      role: string
      content: string | null
      tool_calls?: OpenAIToolCall[]
    }
    finish_reason: string
  }[]
  error?: { message: string }
}

const toOpenAITools = () =>
  Object.values(toolRegistry).map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))

const parseArgs = (raw: string): unknown => {
  try {
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export class OpenAIToolAdapter implements ProviderAdapter {
  private messages: OpenAIMessage[]
  private systemSeeded = false

  constructor(messages: ChatMessage[]) {
    this.messages = messages.map((msg) => ({
      role: msg.role === 'buddy' ? 'assistant' : 'user',
      content: formatPromptWithContext({
        content: msg.content,
        context: msg.context,
      }),
    }))
  }

  private async ensureSystem(): Promise<void> {
    if (this.systemSeeded) return
    const system = await buildWikiSystemText()
    this.messages.unshift({ role: 'system', content: system })
    this.systemSeeded = true
  }

  async send(): Promise<NormalizedTurn> {
    await this.ensureSystem()
    const response = await api()
      .post({
        model: getModelNameFromSettings(),
        messages: this.messages,
        tools: toOpenAITools(),
        stream: false,
      })
      .json<OpenAIToolResponse>()

    if (response.error) {
      throw new Error(`Model error: ${response.error.message}`)
    }

    const message = response.choices?.[0]?.message
    const rawToolCalls = message?.tool_calls ?? []

    this.messages.push({
      role: 'assistant',
      content: message?.content ?? '',
      ...(rawToolCalls.length ? { tool_calls: rawToolCalls } : {}),
    })

    const toolCalls: NormalizedToolCall[] = rawToolCalls.map((tc) => ({
      id: tc.id,
      name: tc.function.name,
      input: parseArgs(tc.function.arguments),
    }))

    return { text: (message?.content ?? '').trim(), toolCalls }
  }

  recordToolResults(results: ToolResultPayload[]): void {
    for (const r of results) {
      this.messages.push({
        role: 'tool',
        tool_call_id: r.id,
        content: r.content,
      })
    }
  }
}
