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

  let iterations = 0
  const maxIterations = 5

  while (iterations < maxIterations) {
    iterations++

    const response = await api()
      .post({
        systemInstruction: { parts: [{ text: SCAFFOLD_PROMPT }] },
        contents: contents,
        tools: GEMINI_TOOLS,
        generationConfig: {
          temperature: 0.7,
        },
      })
      .json<GeminiResponse>()

    const candidate = response.candidates?.[0]
    const content = candidate?.content

    if (!content || !content.parts) break

    const functionCalls = content.parts.filter((p: any) => p.functionCall)

    if (functionCalls.length > 0) {
      contents.push(content)

      const functionResponses = []

      for (const part of functionCalls) {
        const call = part.functionCall
        if (!call || !call.name) continue
        const result = await executeTool(call?.name, call?.args)

        functionResponses.push({
          functionResponse: {
            name: call?.name,
            response: { name: call?.name, content: result },
          },
        })
      }

      contents.push({
        role: 'function',
        parts: functionResponses,
      })

      continue
    }

    const textPart = content.parts.find((p: any) => p.text)
    if (textPart) {
      return textPart.text
    }

    break
  }

  return 'Error: No text response received from Gemini.'
}
