import { proxy } from '@benjypng/logseq-request'

export interface FetchedSource {
  url: string
  contentType: string
  text: string
}

/**
 * Fetches a URL's raw text through Logseq's CORS-free request proxy (renderer
 * `fetch` is blocked from the `lsp://logseq.com` origin). The proxy doesn't
 * expose response headers, so `contentType` is unavailable and defaults to
 * `text/plain` — no downstream consumer reads it. HttpError (HTTP failure on
 * DB builds) and ProxyUnavailableError (unreachable URL / dead IPC) propagate
 * to the caller, matching the previous throw-on-failure behaviour.
 */
export const fetchUrl = async (url: string): Promise<FetchedSource> => {
  const text = await proxy(url).get().text()
  return { url, contentType: 'text/plain', text }
}
