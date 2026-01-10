import { ChatMessage, GemmaResponse } from '../types'
import { formatPromptWithContext, getModelNameFromSettings } from '../utils'
import { api } from '.'

export const handleGemma = async (messages: ChatMessage[]) => {
  try {
    const response = await api()
      .post({
        model: getModelNameFromSettings(),
        messages: messages.map((msg) => ({
          role: msg.role,
          content: formatPromptWithContext({
            content: msg.content,
            context: msg.context,
          }),
        })),
        stream: false,
      })
      .json<GemmaResponse>()
    return response.message.content
  } catch (error) {
    console.error('[NodeBuddy] Local Gemma Error:', error)
    if (error instanceof Error && error.message.includes('Failed to fetch')) {
      return "Error: Could not connect to Ollama. Make sure it's running."
    }
    throw error
  }
}
