import {
  addBlockTag,
  appendBlockInPage,
  createPage,
  createTag,
  getPage,
  updateBlock,
} from '../mcp'
import { ChatMessage } from '../types'

export const writeHistoryToGraph = {
  createPageAndAddTag: async (title: string) => {
    const pageName = `${logseq.settings?.nodeBuddyTag}:${title}`
    let page = await getPage(pageName)
    if (!page) {
      page = await createPage(
        pageName,
        {},
        { redirect: false, createFirstBlock: false, journal: false },
      )
    }
    if (!page) throw Error('NodeBuddy: Page not created')

    const tagName = logseq.settings?.nodeBuddyTag as string
    let tag = await getPage(tagName)

    if (!tag) {
      tag = await createTag(tagName)
    }

    if (!tag) throw Error('NodeBuddy: Tag not created')
    await addBlockTag(page.uuid, tag.uuid)

    return page
  },
  writeMessage: async (pageName: string, msg: ChatMessage) => {
    // Create block first
    const block = await appendBlockInPage(pageName, '')
    if (block) {
      // Wrap chat message in #Code to avoid creating unnecessary backlinks
      await addBlockTag(block.uuid, 'code')
      // Then append message
      await updateBlock(block.uuid, JSON.stringify(msg))
    }
  },
}
