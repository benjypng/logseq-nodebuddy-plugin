import { getModelNameFromSettings } from '../utils'
import {
  getAnthropicApiKeyFromSettings,
  getDeepseekApiKeyFromSettings,
  getGeminiApiKeyFromSettings,
  getGeminiUrl,
  getLocalEndpointFromSettings,
  isAnthropicOAuthToken,
} from '.'

/**
 * As of the Electron update that ships a stricter CORS policy, direct `fetch`
 * (and therefore wretch) from the `lsp://logseq.com` origin to provider APIs
 * (api.anthropic.com, generativelanguage.googleapis.com, localhost Ollama, ...)
 * is blocked at the preflight stage — no `Access-Control-Allow-Origin` header
 * is returned. Logseq's experimental request API (`exper_request`) proxies the
 * call through the main process, which is not subject to CORS, so we route all
 * provider traffic through it instead.
 */

interface ProxyRequestOptions {
  url: string
  method: 'GET' | 'POST'
  headers: Record<string, string>
  // IRequestOptions types this as `Object | ArrayBuffer`; the proxy serialises
  // it to the request body. We always send a JSON object.
  data?: object
  returnType: 'text'
  // Undocumented on older builds; honoured by DB (2.x) to wrap the response
  // with status/ok so we can surface HTTP errors. Harmless when ignored.
  includeResponse: true
}

interface ProxyResponse {
  status: number
  statusText?: string
  ok: boolean
  body: string
}

interface ProxyRequestHost {
  Request: {
    once: (event: string, cb: (res: unknown) => void) => void
  }
  baseInfo: { id: string }
  _execCallableAPIAsync: (
    method: string,
    ...args: unknown[]
  ) => Promise<string | number>
}

const proxyRequest = async <T>(
  url: string,
  headers: Record<string, string>,
  body: object,
): Promise<T> => {
  const options: ProxyRequestOptions = {
    url,
    method: 'POST',
    headers,
    data: body,
    returnType: 'text',
    includeResponse: true,
  }

  const host = logseq as unknown as ProxyRequestHost
  const requestClient = host.Request

  const reqID = await host._execCallableAPIAsync(
    'exper_request',
    host.baseInfo.id,
    options,
  )

  const res = await new Promise<unknown>((resolve) => {
    requestClient.once(`task_callback_${reqID}`, resolve)
  })

  // exper_request returns different shapes across Logseq builds:
  //  - DB (2.x): honours includeResponse -> { status, ok, body, ... }
  //  - markdown (0.10.x): ignores it -> the bare body (text or parsed)
  //  - unreachable endpoint / dead IPC: null/undefined. We surface this with a
  //    "Failed to fetch" message so the existing connection-error handling in
  //    handle-openai-compatible.ts keeps producing friendly guidance.
  if (res == null) {
    throw new Error(
      'Failed to fetch: no response from the request proxy. Is the endpoint reachable (local model running / network up)?',
    )
  }

  // Wrapper shape (DB)
  if (
    typeof res === 'object' &&
    typeof (res as ProxyResponse).status === 'number'
  ) {
    const wrapped = res as ProxyResponse
    if (!wrapped.ok) {
      throw Object.assign(
        new Error(wrapped.statusText || `HTTP ${wrapped.status}`),
        { status: wrapped.status, body: wrapped.body },
      )
    }
    return JSON.parse(wrapped.body) as T
  }

  // Bare body shape (markdown): JSON string, or an already-parsed object/array
  if (typeof res === 'string') return JSON.parse(res) as T
  return res as T
}

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
 * Drop-in replacement for the old wretch builder. Preserves the
 * `api().post(body).json<T>()` call sites used by the provider handlers, but
 * dispatches through Logseq's CORS-free request proxy instead of `fetch`.
 */
export const api = () => {
  const { url, headers } = resolveTarget()
  return {
    post: (body: object) => ({
      json: <T>() => proxyRequest<T>(url, headers, body),
    }),
  }
}
