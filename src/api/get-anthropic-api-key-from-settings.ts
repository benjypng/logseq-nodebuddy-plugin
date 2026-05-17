export const getAnthropicApiKeyFromSettings = () => {
  return (logseq.settings?.anthropicApiKey as string).trim() ?? ''
}

export const isAnthropicOAuthToken = (token: string) =>
  token.startsWith('sk-ant-oat')
