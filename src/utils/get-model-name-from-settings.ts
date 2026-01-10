import { GoogleModels } from '../types'

export const getModelNameFromSettings = (): GoogleModels => {
  return logseq.settings?.model as GoogleModels
}
