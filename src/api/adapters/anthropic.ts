import { tools as toolRegistry } from '../../mcp'
import type {
  ChatMessage,
  ClaudeContentBlock,
  ClaudeResponse,
} from '../../types'
import { formatPromptWithContext, getModelNameFromSettings } from '../../utils'
import { api } from '..'
import { buildAnthropicSystem, type SystemBlock } from './system'
import type {
  NormalizedToolCall,
  NormalizedTurn,
  ProviderAdapter,
  ToolResultPayload,
} from './types'

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | unknown[]
}

interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
  cache_control?: { type: 'ephemeral' }
}

const toAnthropicTools = () =>
  Object.values(toolRegistry).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))

const extractText = (content: ClaudeContentBlock[]): string =>
  content
    .filter(
      (b): b is Extract<ClaudeContentBlock, { type: 'text' }> =>
        b.type === 'text',
    )
    .map((b) => b.text)
    .join('\n')
    .trim()

/**
 * Maintain a single moving cache_control breakpoint on the latest user
 * message's last tool_result so each round caches the growing prefix. Strip it
 * from prior user messages first so we never exceed Anthropic's 4-breakpoint
 * budget (2 are already used in system).
 */
const setMovingMessageCache = (
  apiMessages: AnthropicMessage[],
  newResults: ToolResultBlock[],
): void => {
  for (const m of apiMessages) {
    if (m.role !== 'user' || !Array.isArray(m.content)) continue
    for (const block of m.content as Array<{ cache_control?: unknown }>) {
      if (block && typeof block === 'object' && 'cache_control' in block) {
        delete block.cache_control
      }
    }
  }
  const last = newResults[newResults.length - 1]
  if (last) last.cache_control = { type: 'ephemeral' }
}

export class AnthropicAdapter implements ProviderAdapter {
  private apiMessages: AnthropicMessage[]
  private system: SystemBlock[] | null = null
  private readonly useOAuth: boolean

  constructor(messages: ChatMessage[], useOAuth: boolean) {
    this.useOAuth = useOAuth
    this.apiMessages = messages.map((msg) => ({
      role: msg.role === 'buddy' ? 'assistant' : 'user',
      content: formatPromptWithContext({
        content: msg.content,
        context: msg.context,
      }),
    }))
  }

  private async ensureSystem(): Promise<SystemBlock[]> {
    if (this.system === null) {
      this.system = await buildAnthropicSystem(this.useOAuth)
    }
    return this.system
  }

  async send(): Promise<NormalizedTurn> {
    const system = await this.ensureSystem()
    const response = await api()
      .post({
        model: getModelNameFromSettings(),
        max_tokens: 4096,
        system,
        tools: toAnthropicTools(),
        messages: this.apiMessages,
      })
      .json<ClaudeResponse>()

    const assistantContent = response.content
    this.apiMessages.push({ role: 'assistant', content: assistantContent })

    const toolCalls: NormalizedToolCall[] = assistantContent
      .filter(
        (b): b is Extract<ClaudeContentBlock, { type: 'tool_use' }> =>
          b.type === 'tool_use',
      )
      .map((b) => ({ id: b.id, name: b.name, input: b.input }))

    return { text: extractText(assistantContent), toolCalls }
  }

  recordToolResults(results: ToolResultPayload[]): void {
    const blocks: ToolResultBlock[] = results.map((r) => ({
      type: 'tool_result',
      tool_use_id: r.id,
      content: r.content,
      ...(r.isError ? { is_error: true } : {}),
    }))
    setMovingMessageCache(this.apiMessages, blocks)
    this.apiMessages.push({ role: 'user', content: blocks })
  }
}
