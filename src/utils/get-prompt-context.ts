import { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { ContextItem } from '../types'

export const getPromptContext = async (prompt: string) => {
  const contextData: ContextItem[] = []

  if (prompt.includes('@currentpage')) {
    const blocks = await logseq.Editor.getCurrentPageBlocksTree()
    if (blocks) {
      const pageContent = blocks.map((block: BlockEntity) => ({
        source: 'Current Page Block',
        content: block.fullTitle,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      }))
      contextData.push(...pageContent)
    }
  }

  const tagMatch = prompt.match(/#(\w+)/)
  if (tagMatch && tagMatch[1]) {
    const tagName = tagMatch[1]
    const tagPage = await logseq.Editor.getPage(tagName)
    if (!tagPage) return
    const tagIdent = tagPage.ident
    if (!tagIdent) return

    const blocksContainingTags = await logseq.Editor.getTagObjects(tagIdent)

    if (blocksContainingTags && blocksContainingTags.length > 0) {
      const tagContent = blocksContainingTags.map((block: BlockEntity) => ({
        source: `Tag #${tagName}`,
        content: block.fullTitle,
        createdAt: block.createdAt,
        updatedAt: block.updatedAt,
      }))
      contextData.push(...tagContent)
    }
  }

  return contextData
}
