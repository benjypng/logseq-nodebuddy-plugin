import { tools as toolRegistry } from '../../mcp'
import type { ChatMessage } from '../../types'
import { formatPromptWithContext } from '../../utils'
import { api } from '..'
import { buildWikiSystemText } from './system'
import type {
  NormalizedToolCall,
  NormalizedTurn,
  ProviderAdapter,
  ToolResultPayload,
} from './types'

interface GeminiPart {
  text?: string
  functionCall?: { name: string; args?: Record<string, unknown> }
  functionResponse?: { name: string; response: Record<string, unknown> }
}

interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface GeminiToolResponse {
  candidates?: { content?: { parts?: GeminiPart[] } }[]
  error?: { code: number; message: string; status: string }
}

/** Gemini accepts only an OpenAPI subset — strip JSON-Schema-isms it rejects. */
const sanitizeSchemaForGemini = (schema: unknown): unknown => {
  if (Array.isArray(schema)) return schema.map(sanitizeSchemaForGemini)
  if (schema && typeof schema === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
      if (k === 'additionalProperties' || k === '$defs' || k === '$schema') {
        continue
      }
      out[k] = sanitizeSchemaForGemini(v)
    }
    return out
  }
  return schema
}

const toGeminiTools = () => [
  {
    functionDeclarations: Object.values(toolRegistry).map((t) => ({
      name: t.name,
      description: t.description,
      parameters: sanitizeSchemaForGemini(t.parameters),
    })),
  },
]

export class GeminiAdapter implements ProviderAdapter {
  private contents: GeminiContent[]
  private system: string | null = null
  private round = 0

  constructor(messages: ChatMessage[]) {
    this.contents = messages.map((msg) => ({
      role: msg.role === 'buddy' ? 'model' : 'user',
      parts: [
        {
          text: formatPromptWithContext({
            content: msg.content,
            context: msg.context,
          }),
        },
      ],
    }))
  }

  private async ensureSystem(): Promise<string> {
    if (this.system === null) this.system = await buildWikiSystemText()
    return this.system
  }

  async send(): Promise<NormalizedTurn> {
    const system = await this.ensureSystem()
    this.round++
    const response = await api()
      .post({
        systemInstruction: { parts: [{ text: system }] },
        contents: this.contents,
        tools: toGeminiTools(),
        generationConfig: { temperature: 0.7 },
      })
      .json<GeminiToolResponse>()

    if (response.error) {
      throw new Error(
        `Gemini error ${response.error.code}: ${response.error.message}`,
      )
    }

    const parts = response.candidates?.[0]?.content?.parts ?? []
    this.contents.push({ role: 'model', parts })

    const text = parts
      .map((p) => p.text ?? '')
      .filter(Boolean)
      .join('\n')
      .trim()

    const toolCalls: NormalizedToolCall[] = []
    let i = 0
    for (const p of parts) {
      if (p.functionCall) {
        toolCalls.push({
          id: `${p.functionCall.name}#${this.round}#${i}`,
          name: p.functionCall.name,
          input: p.functionCall.args ?? {},
        })
        i++
      }
    }

    return { text, toolCalls }
  }

  recordToolResults(results: ToolResultPayload[]): void {
    const parts: GeminiPart[] = results.map((r) => ({
      functionResponse: {
        name: r.name,
        response: r.isError ? { error: r.content } : { result: r.content },
      },
    }))
    this.contents.push({ role: 'user', parts })
  }
}
