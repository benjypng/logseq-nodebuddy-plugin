import { proxy } from '@benjypng/logseq-request'

import { getModelNameFromSettings } from '../utils'
import {
  getAnthropicApiKeyFromSettings,
  getDeepseekApiKeyFromSettings,
  getGeminiApiKeyFromSettings,
  getGeminiUrl,
  getLocalEndpointFromSettings,
  isAnthropicOAuthToken,
} from '.'

interface RequestTarget {
  url: string
  headers: Record<string, string>
}

const resolveTarget = (): RequestTarget => {
  const model = getModelNameFromSettings()

  if (model.startsWith('gemma')) {
    return {
      url: getLocalEndpointFromSettings(),
      headers: {
        'Content-Type': 'application/json',
      },
    }
  } else if (model.startsWith('qwen')) {
    return {
      url: getLocalEndpointFromSettings(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer local',
      },
    }
  } else if (model.startsWith('deepseek')) {
    return {
      url: 'https://api.deepseek.com/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getDeepseekApiKeyFromSettings()}`,
      },
    }
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
    return { url: 'https://api.anthropic.com/v1/messages', headers }
  } else {
    return {
      url: getGeminiUrl(),
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': getGeminiApiKeyFromSettings(),
      },
    }
  }
}

/**
 * Resolves the provider target (URL + headers) for the current model and
 * returns a wretch-like builder over Logseq's CORS-free request proxy.
 * Preserves the `api().post(body).json<T>()` call shape used by the provider
 * handlers; `@benjypng/logseq-request` supplies the proxy plumbing that used
 * to be inlined here.
 */
export const api = () => {
  const { url, headers } = resolveTarget()
  return proxy(url).headers(headers)
}
