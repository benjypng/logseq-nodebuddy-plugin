import { dropWhile } from 'lodash'

import { ChatMessage } from '../types'
import { getModelNameFromSettings } from '../utils'
import { handleClaude, handleGemini, handleGemma, handleQwen } from '.'

export const sendMessageToLLM = async (messages: ChatMessage[]) => {
  const validMessages = dropWhile(messages, (m) => m.role !== 'user')
  if (validMessages.length === 0) return ''

  const model = getModelNameFromSettings()

  if (model.startsWith('gemma')) {
    return await handleGemma(validMessages)
  } else if (model.startsWith('qwen')) {
    return await handleQwen(validMessages)
  } else if (model.startsWith('claude')) {
    return await handleClaude(validMessages)
  } else {
    return await handleGemini(validMessages)
  }
}
