export const isNodeBuddyPage = async (pageId: number) => {
  const tag = await logseq.Editor.getTagsByName(
    logseq.settings?.nodeBuddyTag as string,
  )
  if (!tag || !tag[0]) return

  const page = await logseq.Editor.getPage(pageId)
  if (!page || !page.tags) return

  const pageTags = page.tags as number[]

  if (pageTags.includes(tag[0].id)) {
    return true
  } else {
    return false
  }
}
