import wretch from 'wretch'

import { getModelNameFromSettings } from '../utils'
import {
  getAnthropicApiKeyFromSettings,
  getDeepseekApiKeyFromSettings,
  getGeminiApiKeyFromSettings,
  getGeminiUrl,
  getLocalEndpointFromSettings,
  isAnthropicOAuthToken,
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
  } else if (model.startsWith('deepseek')) {
    return wretch()
      .url('https://api.deepseek.com/chat/completions')
      .headers({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getDeepseekApiKeyFromSettings()}`,
      })
      .catcherFallback((error) => {
        console.error('[NodeBuddy] API Error:', error)
        throw error
      })
  } else if (model.startsWith('claude')) {
    const token = getAnthropicApiKeyFromSettings()
    const headers: Record<string, string> = isAnthropicOAuthToken(token)
      ? {
          Authorization: `Bearer ${token}`,
          'anthropic-beta': 'oauth-2025-04-20',
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        }
      : {
          'x-api-key': token,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerously-allow-browser': 'true',
        }
    return wretch()
      .url('https://api.anthropic.com/v1/messages')
      .headers(headers)
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
