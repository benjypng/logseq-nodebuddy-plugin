import wretch from 'wretch'

import { getModelNameFromSettings } from '../utils'
import {
  getAnthropicApiKeyFromSettings,
  getGeminiApiKeyFromSettings,
  getGeminiUrl,
  getLocalEndpointFromSettings,
} from '.'

export const api = () => {
  const model = getModelNameFromSettings()

  if (model.startsWith('gemma')) {
    return wretch()
      .url(getLocalEndpointFromSettings())
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
  } else if (model.startsWith('qwen')) {
    return wretch()
      .url(getLocalEndpointFromSettings())
      .headers({
        'Content-Type': 'application/json',
        Authorization: 'Bearer local',
      })
      .catcherFallback((error) => {
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
        'x-goog-api-key': getGeminiApiKeyFromSettings(),
      })
      .catcherFallback((error) => {
        console.error('[NodeBuddy] API Error:', error)
        throw error
      })
  }
}
