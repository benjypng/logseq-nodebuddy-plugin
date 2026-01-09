export const getApiKeyFromSettings = () => {
  return (logseq.settings?.apiKey as string).trim() ?? ''
}
