import wretch from 'wretch'

import { getApiKeyFromSettings, getGeminiUrl } from '../utils'

export const api = () =>
  wretch()
    .url(getGeminiUrl())
    .headers({
      'Content-Type': 'application/json',
      'x-goog-api-key': getApiKeyFromSettings(),
    })
    .catcherFallback((error) => {
      console.error('[NodeBuddy] API Error:', error)
      throw error
    })
