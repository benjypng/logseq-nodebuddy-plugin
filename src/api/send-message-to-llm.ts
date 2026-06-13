import { dropWhile } from 'lodash'

import type { ChatMessage, ToolCallCallbacks } from '../types'
import { getModelNameFromSettings } from '../utils'
import { getAnthropicApiKeyFromSettings, isAnthropicOAuthToken } from '.'
import { AnthropicAdapter } from './adapters/anthropic'
import { GeminiAdapter } from './adapters/gemini'
import { OpenAIToolAdapter } from './adapters/openai-tool'
import type { ProviderAdapter } from './adapters/types'
import { runToolLoop } from './tool-loop'

export interface SendMessageOptions {
  toolCallbacks?: ToolCallCallbacks
  buddyMessageId?: string
}

/** Mirrors resolveTarget() in api.ts: same prefixes → same provider family. */
const pickAdapter = (messages: ChatMessage[]): ProviderAdapter => {
  const model = getModelNameFromSettings()
  if (model.startsWith('claude')) {
    const useOAuth = isAnthropicOAuthToken(getAnthropicApiKeyFromSettings())
    return new AnthropicAdapter(messages, useOAuth)
  }
  if (
    model.startsWith('gemma') ||
    model.startsWith('qwen') ||
    model.startsWith('deepseek')
  ) {
    return new OpenAIToolAdapter(messages)
  }
  return new GeminiAdapter(messages)
}

export const sendMessageToLLM = async (
  messages: ChatMessage[],
  options: SendMessageOptions = {},
) => {
  const validMessages = dropWhile(messages, (m) => m.role !== 'user')
  if (validMessages.length === 0) return ''

  const adapter = pickAdapter(validMessages)
  return await runToolLoop(adapter, {
    toolCallbacks: options.toolCallbacks,
    buddyMessageId: options.buddyMessageId,
  })
}
