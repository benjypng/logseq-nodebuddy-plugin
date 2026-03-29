import { ChatMessage } from '../types'

export const writeHistoryToGraph = {
  createPageAndAddTag: async (title: string) => {
    const pageName = `${logseq.settings?.nodeBuddyTag}:${title}`
    let page = await logseq.Editor.getPage(pageName)
    if (!page) {
      page = await logseq.Editor.createPage(
        pageName,
        {},
        { redirect: false, createFirstBlock: false, journal: false },
      )
    }
    if (!page) throw Error('NodeBuddy: Page not created')

    const tagName = logseq.settings?.nodeBuddyTag as string
    let tag = await logseq.Editor.getPage(tagName)

    if (!tag) {
      tag = await logseq.Editor.createTag(tagName)
    }

    if (!tag) throw Error('NodeBuddy: Tag not created')
    await logseq.Editor.addBlockTag(page.uuid, tag.uuid)

    return page
  },
  writeMessage: async (pageName: string, msg: ChatMessage) => {
    // Create block first
    const block = await logseq.Editor.appendBlockInPage(pageName, '')
    if (block) {
      // Wrap chat message in #Code to avoid creating unnecessary backlinks
      await logseq.Editor.addBlockTag(block?.uuid, 'code')
      // Then append message
      await logseq.Editor.updateBlock(block.uuid, JSON.stringify(msg))
    }
  },
}
