export interface FetchedSource {
  url: string
  contentType: string
  text: string
}

/**
 * Same CORS constraint as `api.ts`: the newer Electron build blocks renderer
 * `fetch`/`wretch` to arbitrary URLs from the `lsp://logseq.com` origin, so the
 * `/ingest <url>` fetch has to go through Logseq's `exper_request` proxy. The
 * proxy doesn't expose response headers, so `contentType` is unavailable and we
 * default it to `text/plain` (no downstream consumer reads it anyway).
 */

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

interface ProxyResponse {
  status: number
  statusText?: string
  ok: boolean
  body: string
}

export const fetchUrl = async (url: string): Promise<FetchedSource> => {
  const host = logseq as unknown as ProxyRequestHost
  const requestClient = host.Request

  const reqID = await host._execCallableAPIAsync(
    'exper_request',
    host.baseInfo.id,
    {
      url,
      method: 'GET',
      returnType: 'text',
      includeResponse: true,
    },
  )

  const res = await new Promise<unknown>((resolve) => {
    requestClient.once(`task_callback_${reqID}`, resolve)
  })

  if (res == null) {
    throw new Error(
      `Failed to fetch ${url}: no response from the request proxy. Is the URL reachable?`,
    )
  }

  // Wrapper shape (DB build): { status, ok, body }. Unlike the provider API
  // calls, the body here is the raw page text — do NOT JSON.parse it.
  if (
    typeof res === 'object' &&
    typeof (res as ProxyResponse).status === 'number'
  ) {
    const wrapped = res as ProxyResponse
    if (!wrapped.ok) {
      throw new Error(
        `Failed to fetch ${url}: ${wrapped.statusText || `HTTP ${wrapped.status}`}`,
      )
    }
    return { url, contentType: 'text/plain', text: wrapped.body }
  }

  // Bare body shape (markdown build): the response text directly.
  if (typeof res === 'string') {
    return { url, contentType: 'text/plain', text: res }
  }

  // Fallback: stringify whatever we got.
  return { url, contentType: 'text/plain', text: String(res) }
}
