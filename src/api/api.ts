import wretch from 'wretch'

import { getModelNameFromSettings } from '../utils'
import {
  getAnthropicApiKeyFromSettings,
  getApiKeyFromSettings,
  getGeminiUrl,
  getLocalUrl,
} from '.'

export const api = () => {
  const model = getModelNameFromSettings()

  if (model.startsWith('gemma')) {
    return wretch()
      .url(getLocalUrl())
      .headers({
        'Content-Type': 'application/json',
      })
      .catcherFallback((error: any) => {
        if (error.message.includes('Failed to fetch')) {
          console.error(
            '[NodeBuddy] Is Ollama running? Run `ollama serve` in terminal.',
          )
        }
        console.error('[NodeBuddy] API Error:', error)
        throw error
      })
  } else if (model.startsWith('claude')) {
    return wretch()
      .url('https://api.anthropic.com/v1/messages')
      .headers({
        'x-api-key': getAnthropicApiKeyFromSettings(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'anthropic-dangerously-allow-browser': 'true',
      })
      .catcherFallback((error) => {
        console.error('[NodeBuddy] API Error:', error)
        throw error
      })
  } else {
    return wretch()
      .url(getGeminiUrl())
      .headers({
        'Content-Type': 'application/json',
        'x-goog-api-key': getApiKeyFromSettings(),
      })
      .catcherFallback((error) => {
        console.error('[NodeBuddy] API Error:', error)
        throw error
      })
  }
}
