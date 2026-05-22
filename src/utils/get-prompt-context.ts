import { BlockEntity } from '@logseq/libs/dist/LSPlugin'
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  getWeek,
  startOfWeek,
} from 'date-fns'

import {
  getBlock,
  getCurrentPage,
  getCurrentPageBlocks,
  getPage,
  getPageBlocks,
  getPageLinkedRefs,
  getTagBlocks,
  getUserConfigs,
} from '../mcp'
import { ContextItem } from '../types'
import { processBlockChildren } from '.'

export const getPromptContext = async (prompt: string) => {
  const contextData: ContextItem[] = []

  /*
   Handle @current-week
  */
  if (prompt.includes('@currentweek')) {
    const { preferredDateFormat } = await getUserConfigs()
    const now = new Date()
    const weekNumber = getWeek(now)
    const datesInWeek = eachDayOfInterval({
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    })

    for (const date of datesInWeek) {
      const journalPageName = format(date, preferredDateFormat)
      const blocks = await getPageBlocks(journalPageName)
      if (blocks.length > 0) {
        for (const block of blocks) {
          const flattenedContent = processBlockChildren(
            'current-week',
            `Week ${weekNumber} - ${journalPageName}`,
            block,
          )
          contextData.push(...flattenedContent)
        }
      }
    }
  }

  /*
   Handle @current page
  */
  if (prompt.includes('@currentpage')) {
    let blockTree: BlockEntity[] | null = null
    const blocks = await getCurrentPageBlocks()

    let currPageRef = ''
    if (blocks.length > 0 && blocks[0]?.title) {
      blockTree = blocks
    } else {
      const currPage = await getCurrentPage()
      currPageRef = currPage?.fullTitle as string
      if (currPage) {
        const zoomedInBlock = await getBlock(currPage.uuid, {
          includeChildren: true,
        })
        if (zoomedInBlock) {
          blockTree = [zoomedInBlock]
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
    const tagPage = await getPage(tagName)

    if (!tagPage?.ident) continue
    const blocksContainingTags = await getTagBlocks(tagPage.ident)
    if (blocksContainingTags.length > 0) {
      const blockPromises = blocksContainingTags.map((block) =>
        getBlock(block.uuid, { includeChildren: true }),
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

    const linkedBlocks = await getPageLinkedRefs(pageRef)

    if (linkedBlocks.length > 0) {
      const blockPromises = linkedBlocks.map((block) =>
        getBlock(block.uuid, { includeChildren: true }),
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
