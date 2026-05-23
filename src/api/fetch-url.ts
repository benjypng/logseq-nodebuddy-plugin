import wretch from 'wretch'

export interface FetchedSource {
  url: string
  contentType: string
  text: string
}

export const fetchUrl = async (url: string): Promise<FetchedSource> => {
  const res = await wretch().url(url).get().res()
  const contentType = res.headers.get('content-type') ?? 'text/plain'
  const text = await res.text()
  return { url, contentType, text }
}
