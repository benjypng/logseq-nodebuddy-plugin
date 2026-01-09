import { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { ContextItem } from '../types'

export const processBlockChildren = (
  tagName: string,
  block: BlockEntity,
): ContextItem[] => {
  const results: ContextItem[] = []

  results.push({
    source: `Tag #${tagName}`,
    content: block.content || block.title || '',
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  })
  if (block.children && Array.isArray(block.children)) {
    for (const child of block.children) {
      if (typeof child !== 'string') {
        results.push(...processBlockChildren(tagName, child as BlockEntity))
      }
    }
  }
  return results
}
