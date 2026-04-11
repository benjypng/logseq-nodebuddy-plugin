import { NodeBuddyModels } from '../types'

export const getModelNameFromSettings = (): NodeBuddyModels => {
  return logseq.settings?.model as NodeBuddyModels
}
