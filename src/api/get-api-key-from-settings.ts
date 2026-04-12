export const getGeminiApiKeyFromSettings = () => {
  return (logseq.settings?.geminiApiKey as string).trim() ?? ''
}
