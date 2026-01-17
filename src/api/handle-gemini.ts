import { dropWhile } from 'lodash'

import { SCAFFOLD_PROMPT } from '../constants'
import { executeTool, GEMINI_TOOLS } from '../tools'
import { ChatMessage, GeminiResponse } from '../types'
import { formatPromptWithContext } from '../utils'
import { api } from '.'

export const handleGemini = async (messages: ChatMessage[]) => {
  const validMessages = dropWhile(messages, (m) => m.role !== 'user')
  if (validMessages.length === 0) return ''

  const contents: any[] = validMessages.map((msg) => {
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

  while (true) {
    const response = await api()
      .post({
        systemInstruction: { parts: [{ text: SCAFFOLD_PROMPT }] },
        contents: contents,
        tools: GEMINI_TOOLS,
        toolConfig: {
          functionCallingConfig: {
            mode: 'AUTO',
          },
        },
        generationConfig: {
          temperature: 0.7,
        },
      })
      .json<GeminiResponse>()

    const candidateContent = response.candidates?.[0]?.content
    const part = candidateContent?.parts?.[0]

    if (part?.text) {
      return part.text
    }

    if (part?.functionCall) {
      const call = part.functionCall

      const toolResult = await executeTool(call.name, call.args)

      if (!candidateContent) return ''
      contents.push(candidateContent)

      contents.push({
        role: 'function',
        parts: [
          {
            functionResponse: {
              name: call.name,
              response: { name: call.name, content: toolResult },
            },
          },
        ],
      })

      continue
    }

    return ''
  }
}
