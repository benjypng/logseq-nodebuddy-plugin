import { dropWhile } from 'lodash'

import { ChatMessage, GeminiResponse } from '../types'
import { formatPromptWithContext } from '../utils'
import { api } from '.'

export const sendMessageToGemini = async (messages: ChatMessage[]) => {
  const validMessages = dropWhile(messages, (m) => m.role !== 'user')
  if (validMessages.length === 0) return ''

  const contents = validMessages.map((msg) => {
    const { role, content, context } = msg
    return {
      role: role === 'buddy' ? 'model' : 'user',
      parts: [
        {
          text: formatPromptWithContext({
            content: content,
            context: context,
          }),
        },
      ],
    }
  })

  const response = await api().post({ contents }).json<GeminiResponse>()
  return response.candidates?.[0]?.content?.parts?.[0]?.text || ''
}
