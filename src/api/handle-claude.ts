import { dropWhile } from 'lodash'

import {
  formatCustomInstructions,
  getBaseScaffoldPrompt,
  getClaudeMdInstructions,
} from '../constants'
import { ChatMessage, ClaudeResponse } from '../types'
import { formatPromptWithContext, getModelNameFromSettings } from '../utils'
import { api, getAnthropicApiKeyFromSettings, isAnthropicOAuthToken } from '.'

const CLAUDE_CODE_OAUTH_SYSTEM_PREFIX =
  "You are Claude Code, Anthropic's official CLI for Claude."

interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

export const handleClaude = async (messages: ChatMessage[]) => {
  const validMessages = dropWhile(messages, (m) => m.role !== 'user')
  if (validMessages.length === 0) return ''

  const formattedMessages = validMessages.map((msg) => {
    const { role, content, context } = msg
    return {
      role: role === 'buddy' ? 'assistant' : 'user',
      content: formatPromptWithContext({
        content: content,
        context: context,
      }),
    }
  })

  const useOAuth = isAnthropicOAuthToken(getAnthropicApiKeyFromSettings())
  const customInstructions = await getClaudeMdInstructions()
  const customBlockText = formatCustomInstructions(customInstructions)

  const system: SystemBlock[] = []
  if (useOAuth) {
    system.push({ type: 'text', text: CLAUDE_CODE_OAUTH_SYSTEM_PREFIX })
  }
  system.push({ type: 'text', text: getBaseScaffoldPrompt() })
  if (customBlockText) {
    system.push({
      type: 'text',
      text: customBlockText,
      cache_control: { type: 'ephemeral' },
    })
  }

  const response = await api()
    .post({
      model: getModelNameFromSettings(),
      max_tokens: 4096,
      system,
      messages: formattedMessages,
    })
    .json<ClaudeResponse>()

  return response.content[0]?.text || ''
}
