import { dropWhile } from 'lodash'

import { getScaffoldPrompt } from '../constants'
import { ChatMessage, ClaudeResponse } from '../types'
import { formatPromptWithContext, getModelNameFromSettings } from '../utils'
import { api } from '.'

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

  const response = await api()
    .post({
      model: getModelNameFromSettings(),
      max_tokens: 4096,
      system: getScaffoldPrompt(),
      messages: formattedMessages,
    })
    .json<ClaudeResponse>()

  return response.content[0]?.text || ''
}
