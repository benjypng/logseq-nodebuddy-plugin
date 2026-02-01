import { SCAFFOLD_PROMPT } from '../constants'
import { ChatMessage, QwenResponse } from '../types'
import { formatPromptWithContext, getModelNameFromSettings } from '../utils'
import { api } from '.'

export const handleQwen = async (messages: ChatMessage[]) => {
  try {
    const response = await api()
      .post({
        model: getModelNameFromSettings(),
        messages: [
          { role: 'system', content: SCAFFOLD_PROMPT },
          ...messages.map((msg) => ({
            role: msg.role === 'buddy' ? 'assistant' : 'user',
            content: formatPromptWithContext({
              content: msg.content,
              context: msg.context,
            }),
          })),
        ],
        stream: false,
      })
      .json<QwenResponse>()
    return response.choices?.[0]?.message?.content || ''
  } catch (error) {
    console.error('[NodeBuddy] Qwen Error:', error)
    throw error
  }
}
