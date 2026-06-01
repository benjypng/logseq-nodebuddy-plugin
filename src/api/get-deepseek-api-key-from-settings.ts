export const getDeepseekApiKeyFromSettings = () => {
  return (logseq.settings?.deepseekApiKey as string).trim() ?? ''
}
