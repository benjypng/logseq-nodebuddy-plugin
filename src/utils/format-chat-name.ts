export const formatChatName = (name: string) => {
  const tagName = logseq.settings?.nodeBuddyTag as string
  if (!tagName) return name
  return name
    .replace(`${tagName}:`, '')
    .replace(`${tagName.toLowerCase()}:`, '')
}
