import { dropWhile } from 'lodash'

import type { ChatMessage, ToolCallCallbacks } from '../types'
import { getModelNameFromSettings } from '../utils'
import { handleClaude, handleGemini, handleGemma, handleQwen } from '.'

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
    return await handleGemma(validMessages)
  } else if (model.startsWith('qwen')) {
    return await handleQwen(validMessages)
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
