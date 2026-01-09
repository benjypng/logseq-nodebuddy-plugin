import { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { ContextItem } from '../types'
import { processBlockChildren } from '.'

export const getPromptContext = async (prompt: string) => {
  const contextData: ContextItem[] = []

  /*
   Handle @current page
  */
  if (prompt.includes('@currentpage')) {
    let blockTree: BlockEntity[] | null = null
    const blocks = await logseq.Editor.getCurrentPageBlocksTree()

    let currPageRef = ''
    if (blocks && blocks.length > 0) {
      blockTree = blocks
    } else {
      const currPage = await logseq.Editor.getCurrentPage()
      currPageRef = currPage?.fullTitle as string
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
          'current-page',
          currPageRef,
          block,
        )
        contextData.push(...flattenedContent)
      }
    }
  }

  /*
   Handle @tags
  */
  const tagMatches = [...prompt.matchAll(/#(\w+)/g)]
  for (const match of tagMatches) {
    const tagName = match[1]
    if (!tagName) continue
    const tagPage = await logseq.Editor.getPage(tagName)

    if (!tagPage?.ident) continue
    const blocksContainingTags = await logseq.Editor.getTagObjects(
      tagPage.ident,
    )
    if (blocksContainingTags && blocksContainingTags.length > 0) {
      const blockPromises = blocksContainingTags.map((block) =>
        logseq.Editor.getBlock(block.uuid, { includeChildren: true }),
      )
      const fullBlocks = await Promise.all(blockPromises)
      for (const fullBlock of fullBlocks) {
        if (fullBlock) {
          const flattenedContent = processBlockChildren(
            'tag',
            tagName,
            fullBlock,
          )
          contextData.push(...flattenedContent)
        }
      }
    }
  }

  /*
   Handle [[block references]]
   */
  const pageRefMatches = [...prompt.matchAll(/\[\[(.*?)\]\]/g)]

  for (const match of pageRefMatches) {
    const pageRef = match[1]
    if (!pageRef) continue

    const pageLinkedRefs = await logseq.Editor.getPageLinkedReferences(pageRef)
    if (!pageLinkedRefs) continue

    const refs = pageLinkedRefs as unknown as Record<string, BlockEntity[]>

    const linkedBlocks = Object.values(refs).flat()

    if (linkedBlocks && linkedBlocks.length > 0) {
      const blockPromises = linkedBlocks.map((block) =>
        logseq.Editor.getBlock(block.uuid, { includeChildren: true }),
      )

      const fullBlocks = await Promise.all(blockPromises)

      for (const fullBlock of fullBlocks) {
        if (fullBlock) {
          const flattenedContent = processBlockChildren(
            'page-reference',
            pageRef,
            fullBlock,
          )
          contextData.push(...flattenedContent)
        }
      }
    }
  }

  return contextData
}
