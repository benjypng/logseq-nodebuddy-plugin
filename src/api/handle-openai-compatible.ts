import { getScaffoldPrompt } from '../constants'
import { ChatMessage, OllamaResponse } from '../types'
import { formatPromptWithContext, getModelNameFromSettings } from '../utils'
import { api } from '.'

interface OpenAICompatibleOptions {
  label: string
  connectionErrorMessage?: string
}

export const handleOpenAICompatible = async (
  messages: ChatMessage[],
  { label, connectionErrorMessage }: OpenAICompatibleOptions,
) => {
  try {
    const scaffoldPrompt = await getScaffoldPrompt()
    const response = await api()
      .post({
        model: getModelNameFromSettings(),
        messages: [
          { role: 'system', content: scaffoldPrompt },
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
      .json<OllamaResponse>()
    return response.choices?.[0]?.message?.content || ''
  } catch (error) {
    console.error(`[NodeBuddy] ${label} Error:`, error)
    if (
      connectionErrorMessage &&
      error instanceof Error &&
      error.message.includes('Failed to fetch')
    ) {
      return connectionErrorMessage
    }
    throw error
  }
}
