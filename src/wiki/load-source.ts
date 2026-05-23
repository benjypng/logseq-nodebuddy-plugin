import type { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { fetchUrl } from '../api'
import { getBlock, getPage, getPageBlocks } from '../mcp'

/** What the user asked for (intent, before lookup). */
export type IngestTargetKind = 'url' | 'page' | 'uuid' | 'text' | 'empty'

/** What was actually loaded (after lookup). */
export type LoadedSourceKind = 'url' | 'logseq-page' | 'logseq-block' | 'inline'

export interface IngestTarget {
  kind: IngestTargetKind
  ref: string
}

export interface LoadedIngestSource {
  kind: LoadedSourceKind
  identifier: string
  title?: string
  pageUuid?: string
  blockUuid?: string
  text: string
}

const URL_RE = /^https?:\/\//i
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PAGE_PREFIX_RE = /^page:/i
const UUID_PREFIX_RE = /^uuid:/i

/**
 * Parse the user's `/ingest` argument into an intent.
 *
 * Rules (in order):
 *   1. Starts with `http(s)://` → URL.
 *   2. Starts with `page:` (case-insensitive) → page lookup; the rest is the
 *      page title verbatim (colons in the title are fine).
 *   3. Starts with `uuid:` (case-insensitive) → page-or-block by UUID.
 *   4. Empty → 'empty' (so the caller can show a friendly hint).
 *   5. Anything else → 'text' (pasted source content).
 */
export const parseIngestTarget = (raw: string): IngestTarget => {
  const arg = raw.trim()
  if (!arg) return { kind: 'empty', ref: '' }
  if (URL_RE.test(arg)) return { kind: 'url', ref: arg }
  if (PAGE_PREFIX_RE.test(arg)) {
    return { kind: 'page', ref: arg.replace(PAGE_PREFIX_RE, '').trim() }
  }
  if (UUID_PREFIX_RE.test(arg)) {
    return { kind: 'uuid', ref: arg.replace(UUID_PREFIX_RE, '').trim() }
  }
  return { kind: 'text', ref: arg }
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
    case 'empty':
      throw new Error(
        '/ingest needs an argument: a URL, page:<title>, uuid:<uuid>, or pasted text.',
      )
    case 'url': {
      const res = await fetchUrl(parsed.ref)
      return { kind: 'url', identifier: parsed.ref, text: res.text }
    }
    case 'page': {
      if (!parsed.ref) {
        throw new Error('`page:` needs a title after the colon.')
      }
      const page = await getPage(parsed.ref)
      if (!page) throw new Error(`No page found titled "${parsed.ref}".`)
      const blocks = await getPageBlocks(page.name)
      return {
        kind: 'logseq-page',
        identifier: parsed.ref,
        title: page.name,
        pageUuid: page.uuid,
        text: flattenBlockTree(blocks),
      }
    }
    case 'uuid': {
      if (!parsed.ref) {
        throw new Error('`uuid:` needs a UUID after the colon.')
      }
      if (!UUID_RE.test(parsed.ref)) {
        throw new Error(
          `"${parsed.ref}" is not a valid UUID. Expected 8-4-4-4-12 hex form.`,
        )
      }
      // Try page first (pages are blocks internally). Some Logseq builds throw
      // on non-page UUIDs passed to getPage, so swallow and fall through.
      let maybePage = null
      try {
        maybePage = await getPage(parsed.ref)
      } catch (err) {
        console.warn(
          '[NodeBuddy] getPage(uuid) failed, falling through to getBlock:',
          err,
        )
      }
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
      if (!block) {
        throw new Error(`No page or block found with UUID "${parsed.ref}".`)
      }
      const title = block.title?.slice(0, 80) ?? 'Block'
      return {
        kind: 'logseq-block',
        identifier: parsed.ref,
        title,
        blockUuid: block.uuid,
        text: flattenBlockTree([block]),
      }
    }
    case 'text':
      return { kind: 'inline', identifier: parsed.ref, text: parsed.ref }
  }
}
