import type { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { fetchUrl } from '../api'
import { getBlock, getPage, getPageBlocks } from '../mcp'

export type IngestSourceKind = 'url' | 'logseq-page' | 'logseq-block' | 'inline'

export interface IngestTarget {
  kind: IngestSourceKind
  ref: string
}

export interface LoadedIngestSource {
  kind: IngestSourceKind
  identifier: string
  title?: string
  pageUuid?: string
  blockUuid?: string
  text: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const parseIngestTarget = (raw: string): IngestTarget => {
  const arg = raw.trim()
  if (/^https?:\/\//i.test(arg)) return { kind: 'url', ref: arg }

  const pageMatch = arg.match(/^\[\[(.+?)\]\]$/)
  if (pageMatch?.[1]) return { kind: 'logseq-page', ref: pageMatch[1].trim() }

  if (/^page:/i.test(arg)) {
    return { kind: 'logseq-page', ref: arg.replace(/^page:/i, '').trim() }
  }
  if (/^block:/i.test(arg)) {
    return { kind: 'logseq-block', ref: arg.replace(/^block:/i, '').trim() }
  }

  if (UUID_RE.test(arg)) return { kind: 'logseq-block', ref: arg }

  return { kind: 'inline', ref: arg }
}

const flattenBlockTree = (blocks: BlockEntity[], depth = 0): string => {
  const lines: string[] = []
  for (const block of blocks) {
    if (block.title) lines.push(`${'  '.repeat(depth)}- ${block.title}`)
    if (Array.isArray(block.children)) {
      const children = block.children.filter(
        (c): c is BlockEntity => typeof c !== 'string',
      )
      if (children.length > 0) lines.push(flattenBlockTree(children, depth + 1))
    }
  }
  return lines.filter(Boolean).join('\n')
}

export const loadIngestSource = async (
  raw: string,
): Promise<LoadedIngestSource> => {
  const parsed = parseIngestTarget(raw)
  switch (parsed.kind) {
    case 'url': {
      const res = await fetchUrl(parsed.ref)
      return { kind: 'url', identifier: parsed.ref, text: res.text }
    }
    case 'logseq-page': {
      const page = await getPage(parsed.ref)
      if (!page) throw new Error(`No page found for "${parsed.ref}"`)
      const blocks = await getPageBlocks(page.name)
      return {
        kind: 'logseq-page',
        identifier: parsed.ref,
        title: page.name,
        pageUuid: page.uuid,
        text: flattenBlockTree(blocks),
      }
    }
    case 'logseq-block': {
      // A UUID can be either a page or a block. Try page first.
      const maybePage = await getPage(parsed.ref)
      if (maybePage) {
        const blocks = await getPageBlocks(maybePage.name)
        return {
          kind: 'logseq-page',
          identifier: parsed.ref,
          title: maybePage.name,
          pageUuid: maybePage.uuid,
          text: flattenBlockTree(blocks),
        }
      }
      const block = await getBlock(parsed.ref, { includeChildren: true })
      if (!block) throw new Error(`No page or block found for "${parsed.ref}"`)
      const title = block.title?.slice(0, 80) ?? 'Block'
      return {
        kind: 'logseq-block',
        identifier: parsed.ref,
        title,
        blockUuid: block.uuid,
        text: flattenBlockTree([block]),
      }
    }
    case 'inline':
      return { kind: 'inline', identifier: parsed.ref, text: parsed.ref }
  }
}
