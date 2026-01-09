import { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { ContextItem, Source } from '../types'

export const processBlockChildren = (
  sourceRef: Source,
  ref: string,
  block: BlockEntity,
): ContextItem[] => {
  const results: ContextItem[] = []
  let source = ''
  switch (sourceRef) {
    case 'tag':
      source = `Tag #${ref}`
      break
    case 'current-page':
      source = `Current Page Block`
      break
    case 'page-reference':
      source = `Page Reference: [[${ref}]]`
      break
  }

  results.push({
    source: source,
    content: block.fullTitle,
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
  })
  if (block.children && Array.isArray(block.children)) {
    for (const child of block.children) {
      if (typeof child !== 'string') {
        results.push(
          ...processBlockChildren(sourceRef, ref, child as BlockEntity),
        )
      }
    }
  }
  return results
}
