export const getLocalEndpointFromSettings = () => {
  return (logseq.settings?.localEndpoint as string).trim() ?? ''
}
