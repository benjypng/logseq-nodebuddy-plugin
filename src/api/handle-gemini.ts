import { dropWhile } from 'lodash'

import { SCAFFOLD_PROMPT } from '../constants'
import { ChatMessage, GeminiResponse } from '../types'
import { formatPromptWithContext } from '../utils'
import { api } from '.'

export const handleGemini = async (messages: ChatMessage[]) => {
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
  const response = await api()
    .post({
      systemInstruction: { parts: [{ text: SCAFFOLD_PROMPT }] },
      contents: contents,
      generationConfig: {
        temperature: 0.7,
      },
    })
    .json<GeminiResponse>()
  return response.candidates?.[0]?.content?.parts?.[0]?.text || ''
}
