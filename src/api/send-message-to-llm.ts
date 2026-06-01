import { dropWhile } from 'lodash'

import type { ChatMessage, ToolCallCallbacks } from '../types'
import { getModelNameFromSettings } from '../utils'
import { handleClaude, handleGemini, handleOpenAICompatible } from '.'

export interface SendMessageOptions {
  wikiMode?: boolean
  toolCallbacks?: ToolCallCallbacks
  buddyMessageId?: string
}

export class WikiModeRequiresClaudeError extends Error {
  constructor() {
    super(
      'Wiki Mode requires a Claude model. Switch to a Claude model in NodeBuddy settings.',
    )
    this.name = 'WikiModeRequiresClaudeError'
  }
}

export const sendMessageToLLM = async (
  messages: ChatMessage[],
  options: SendMessageOptions = {},
) => {
  const validMessages = dropWhile(messages, (m) => m.role !== 'user')
  if (validMessages.length === 0) return ''

  const model = getModelNameFromSettings()
  const isClaude = model.startsWith('claude')

  if (options.wikiMode && !isClaude) {
    throw new WikiModeRequiresClaudeError()
  }

  if (model.startsWith('gemma')) {
    return await handleOpenAICompatible(validMessages, {
      label: 'Local Gemma',
      connectionErrorMessage:
        "Error: Could not connect to Ollama. Make sure it's running.",
    })
  } else if (model.startsWith('qwen')) {
    return await handleOpenAICompatible(validMessages, { label: 'Qwen' })
  } else if (model.startsWith('deepseek')) {
    return await handleOpenAICompatible(validMessages, { label: 'DeepSeek' })
  } else if (isClaude) {
    return await handleClaude(validMessages, {
      wikiMode: options.wikiMode,
      toolCallbacks: options.toolCallbacks,
      buddyMessageId: options.buddyMessageId,
    })
  } else {
    return await handleGemini(validMessages)
  }
}
