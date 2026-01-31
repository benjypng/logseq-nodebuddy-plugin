export const getAnthropicApiKeyFromSettings = () => {
  return (logseq.settings?.anthropicApiKey as string).trim() ?? ''
}
