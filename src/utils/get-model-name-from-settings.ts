export const getModelNameFromSettings = () => {
  return (logseq.settings?.model as string)?.trim() ?? 'No model selected'
}
