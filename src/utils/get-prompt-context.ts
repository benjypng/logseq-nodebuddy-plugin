import { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { ContextItem } from '../types'
import { processBlockChildren } from '.'

export const getPromptContext = async (prompt: string) => {
  const contextData: ContextItem[] = []

  if (prompt.includes('@currentpage')) {
    let blockTree: BlockEntity[] | null = null

    const blocks = await logseq.Editor.getCurrentPageBlocksTree()
    if (blocks) {
      blockTree = blocks
    } else {
      const currPage = await logseq.Editor.getCurrentPage()
      if (currPage) {
        const zoomedInBlock = await logseq.Editor.getBlock(currPage.uuid, {
          includeChildren: true,
        })
        if (zoomedInBlock?.children) {
          blockTree = zoomedInBlock.children as BlockEntity[]
        }
      }
    }
    if (blockTree) {
      for (const block of blockTree) {
        const flattenedContent = processBlockChildren(
          'Current Page Block',
          block,
        )
        contextData.push(...flattenedContent)
      }
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
      // get children
      const blockPromises = blocksContainingTags.map((block) =>
        logseq.Editor.getBlock(block.uuid, { includeChildren: true }),
      )
      const fullBlocks = await Promise.all(blockPromises)
      for (const fullBlock of fullBlocks) {
        if (fullBlock) {
          const flattenedContent = processBlockChildren(tagName, fullBlock)
          contextData.push(...flattenedContent)
        }
      }

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
