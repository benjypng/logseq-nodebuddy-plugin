import { ChatMessage } from '../types'

export const writeHistoryToGraph = {
  createPageAndAddTag: async (title: string) => {
    const pageName = `${logseq.settings?.nodeBuddyTag}:${title}`
    let page = await logseq.Editor.getPage(pageName)
    if (!page) {
      page = await logseq.Editor.createPage(pageName)
    } else {
      logseq.App.pushState('page', { name: pageName })
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
    await logseq.Editor.appendBlockInPage(pageName, JSON.stringify(msg))
  },
}
