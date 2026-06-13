import type {
  BlockEntity,
  BlockIdentity,
  PageEntity,
  PageIdentity,
} from '@logseq/libs/dist/LSPlugin'
import { format, parse, parseISO } from 'date-fns'

import type { JSONSchema, Tool, ToolRegistry } from './types'

/* ---------- Read tools ---------- */

/**
 * Logseq's page-name index is case-insensitive but the API requires lowercase
 * input for string lookups. Normalise strings; pass UUIDs / db-ids through.
 * (UUIDs are already lowercase by spec; lowercasing them is a no-op.)
 */
const normalisePageRef = <T extends PageIdentity | number>(ref: T): T => {
  if (typeof ref === 'string') return ref.toLowerCase() as T
  return ref
}

export const getCurrentPage = async (): Promise<PageEntity | null> => {
  const page = await logseq.Editor.getCurrentPage()
  return (page as PageEntity | null) ?? null
}

export const getPage = async (
  identity: PageIdentity | number,
): Promise<PageEntity | null> => {
  const page = await logseq.Editor.getPage(normalisePageRef(identity))
  return page ?? null
}

export const getPageBlocks = async (
  name: PageIdentity,
): Promise<BlockEntity[]> => {
  const blocks = await logseq.Editor.getPageBlocksTree(normalisePageRef(name))
  return blocks ?? []
}

export const getCurrentPageBlocks = async (): Promise<BlockEntity[]> => {
  const blocks = await logseq.Editor.getCurrentPageBlocksTree()
  return blocks ?? []
}

export const getBlock = async (
  uuid: BlockIdentity,
  opts?: { includeChildren?: boolean },
): Promise<BlockEntity | null> => {
  const block = await logseq.Editor.getBlock(uuid, opts)
  return block ?? null
}

export const getTagBlocks = async (
  nameOrIdent: string,
): Promise<BlockEntity[]> => {
  const blocks = await logseq.Editor.getTagObjects(nameOrIdent)
  return blocks ?? []
}

export const getPageLinkedRefs = async (
  page: PageIdentity,
): Promise<BlockEntity[]> => {
  const refs = await logseq.Editor.getPageLinkedReferences(
    normalisePageRef(page),
  )
  if (!refs) return []
  return refs.flatMap(([, blocks]) => blocks)
}

export const getTagsByName = async (name: string): Promise<PageEntity[]> => {
  const tags = await logseq.Editor.getTagsByName(name)
  return tags ?? []
}

export const getUserConfigs = async () => logseq.App.getUserConfigs()

export const datascriptQuery = async <T = unknown>(
  query: string,
  ...inputs: unknown[]
): Promise<T> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (logseq.DB as any).datascriptQuery(query, ...inputs) as Promise<T>
}

/* ---------- Write tools ---------- */

type CreatePageOpts = Partial<{
  redirect: boolean
  createFirstBlock: boolean
  format: BlockEntity['format']
  journal: boolean
  customUUID: string
}>

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const parseDateStr = (dateStr: string): Date | null => {
  const iso = parseISO(dateStr)
  if (!Number.isNaN(iso.getTime())) return iso
  const manual = parse(dateStr, 'yyyy-MM-dd', new Date())
  return Number.isNaN(manual.getTime()) ? null : manual
}

/**
 * In a Logseq DB graph, "date"-typed properties hold a reference to a journal
 * page, not a string. Given a `yyyy-MM-dd` string, ensure the journal page
 * exists and return its numeric db/id.
 *
 * Mirrors the canonical pattern:
 *   const page = await logseq.Editor.createJournalPage(formattedDateStr)
 *   if (page) use page.id
 *
 * `createJournalPage` returns `null` when the journal page already exists, so
 * we fall back to looking it up — by the user's preferred date format (the
 * actual page name), then by ISO, then via :block/journal-day.
 */
export const ensureJournalPage = async (
  dateStr: string,
): Promise<number | null> => {
  if (!DATE_RE.test(dateStr)) return null
  const date = parseDateStr(dateStr)
  if (!date) return null
  const iso = format(date, 'yyyy-MM-dd')

  // 1) Create-or-noop. If the page is fresh, we get it back with .id.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = logseq.Editor as any
  try {
    const p = await editor.createJournalPage(iso)
    if (p && typeof p.id === 'number') return p.id
  } catch (err) {
    console.warn('[NodeBuddy] createJournalPage failed:', err)
  }

  // 2) Page already exists — look it up by the user's preferred date format
  //    (the page name Logseq actually stored it under).
  try {
    const cfg = await logseq.App.getUserConfigs()
    const preferredFormat = (cfg as { preferredDateFormat?: string })
      ?.preferredDateFormat
    if (preferredFormat) {
      const formattedName = format(date, preferredFormat)
      const page = await logseq.Editor.getPage(formattedName)
      if (page && typeof page.id === 'number') return page.id
    }
  } catch (err) {
    console.warn('[NodeBuddy] preferred-format lookup failed:', err)
  }

  // 3) Try the ISO name directly.
  try {
    const page = await logseq.Editor.getPage(iso)
    if (page && typeof page.id === 'number') return page.id
  } catch (err) {
    console.warn('[NodeBuddy] getPage(iso) failed:', err)
  }

  // 4) Datascript on :block/journal-day with the value inlined (avoid any
  //    :in binding quirks across builds).
  try {
    const dayInt = Number(format(date, 'yyyyMMdd'))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = logseq.DB as any
    const rows = await db.datascriptQuery(
      `[:find ?e :where [?e :block/journal-day ${dayInt}]]`,
    )
    const id = rows?.[0]?.[0]
    if (typeof id === 'number') return id
  } catch (err) {
    console.warn('[NodeBuddy] journal-day lookup failed:', err)
  }

  return null
}

const resolveDateValue = async (value: unknown): Promise<unknown> => {
  if (typeof value === 'string' && DATE_RE.test(value)) {
    const id = await ensureJournalPage(value)
    if (id == null) {
      throw new Error(
        `Could not resolve date "${value}" to a journal page. The Logseq Editor API rejected createJournalPage and no existing page was found. Try passing the page reference directly via a numeric db/id, or create the journal page in Logseq first.`,
      )
    }
    return id
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map(resolveDateValue))
  }
  return value
}

const resolveDateProperties = async (
  properties: Record<string, unknown>,
): Promise<Record<string, unknown>> => {
  const entries = await Promise.all(
    Object.entries(properties).map(async ([k, v]) => [
      k,
      await resolveDateValue(v),
    ]),
  )
  return Object.fromEntries(entries)
}

export const createPage = async (
  name: string,
  properties: Record<string, unknown> = {},
  opts: CreatePageOpts = {},
): Promise<PageEntity | null> => {
  const resolved = await resolveDateProperties(properties)
  // Default redirect:false so wiki writes don't yank the user away from
  // whatever they're reading in Logseq. Callers can still pass redirect:true
  // explicitly if they want navigation.
  const mergedOpts: CreatePageOpts = { redirect: false, ...opts }
  const page = await logseq.Editor.createPage(name, resolved, mergedOpts)
  return page ?? null
}

export const createTag = async (name: string): Promise<PageEntity | null> => {
  const tag = await logseq.Editor.createTag(name)
  return tag ?? null
}

export const appendBlockInPage = async (
  page: PageIdentity,
  content: string,
): Promise<BlockEntity | null> => {
  const block = await logseq.Editor.appendBlockInPage(
    normalisePageRef(page),
    content,
  )
  return block ?? null
}

export const insertBlock = async (
  parentUuid: BlockIdentity,
  content: string,
  opts?: { sibling?: boolean; properties?: Record<string, unknown> },
): Promise<BlockEntity | null> => {
  const block = await logseq.Editor.insertBlock(parentUuid, content, opts)
  return block ?? null
}

/**
 * Recursive block tree for batch inserts. `properties` is intentionally
 * omitted — IBatchBlock.properties is unsupported on DB graphs; properties
 * must be set per-block afterwards via upsert_block_property.
 */
export interface BatchBlock {
  content: string
  children?: BatchBlock[]
}

export const insertBatchBlocks = async (
  parentUuid: BlockIdentity,
  blocks: BatchBlock | BatchBlock[],
  opts?: { sibling?: boolean; before?: boolean; keepUUID?: boolean },
): Promise<BlockEntity[] | null> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editor = logseq.Editor as any
  const result = await editor.insertBatchBlock(parentUuid, blocks, opts)
  return (result as BlockEntity[] | null) ?? null
}

export const appendBatchBlocksToPage = async (
  pageName: PageIdentity,
  blocks: BatchBlock[],
): Promise<BlockEntity[] | null> => {
  const page = await getPage(pageName)
  if (!page?.uuid) throw new Error(`Page not found: ${pageName}`)
  return insertBatchBlocks(page.uuid, blocks, { sibling: false })
}

export const updateBlock = async (
  uuid: BlockIdentity,
  content: string,
): Promise<void> => {
  await logseq.Editor.updateBlock(uuid, content)
}

export const addBlockTag = async (
  block: BlockIdentity,
  tag: BlockIdentity,
): Promise<void> => {
  await logseq.Editor.addBlockTag(block, tag)
}

export const addPageTag = async (
  pageName: string,
  tag: string,
): Promise<void> => {
  const page = await getPage(pageName)
  if (!page?.uuid) throw new Error(`Page not found: ${pageName}`)
  await addBlockTag(page.uuid, tag)
}

export const upsertPageProperty = async (
  pageName: string,
  key: string,
  value: unknown,
): Promise<void> => {
  const page = await getPage(pageName)
  if (!page?.uuid) throw new Error(`Page not found: ${pageName}`)
  const resolved = await resolveDateValue(value)
  await logseq.Editor.upsertBlockProperty(page.uuid, key, resolved)
}

export const upsertBlockProperty = async (
  uuid: BlockIdentity,
  key: string,
  value: unknown,
): Promise<void> => {
  const resolved = await resolveDateValue(value)
  await logseq.Editor.upsertBlockProperty(uuid, key, resolved)
}

/**
 * Resolves a user-defined property's stable ident (e.g. "sources" →
 * ":user.property/sources-Hh35PH44") by querying the DB. Falls back to
 * `null` when no match. Cached per session.
 */
const identCache = new Map<string, string>()
export const resolvePropertyIdent = async (
  humanName: string,
): Promise<string | null> => {
  const cached = identCache.get(humanName)
  if (cached) return cached
  const needle = humanName.toLowerCase()
  const prefix = `:user.property/${humanName}-`
  try {
    // Case-insensitive title match — :block/title preserves casing, so
    // lowercase both sides before comparing.
    const result = await datascriptQuery<[string][]>(
      `[:find ?ident :where [?p :db/ident ?ident] [?p :block/title ?title] [(clojure.string/lower-case ?title) ?lower] [(= ?lower "${needle.replace(/"/g, '\\"')}")]]`,
    )
    const ident = result?.[0]?.[0]
    if (ident && typeof ident === 'string') {
      identCache.set(humanName, ident)
      return ident
    }
    const fallback = await datascriptQuery<[string][]>(
      `[:find ?ident :where [_ :db/ident ?ident] [(clojure.string/starts-with? (str ?ident) "${prefix}")]]`,
    )
    const found = fallback?.[0]?.[0]
    if (found && typeof found === 'string') {
      identCache.set(humanName, found)
      return found
    }
    return null
  } catch {
    return null
  }
}

/* ---------- Registry (LLM-facing surface) ---------- */

const tool = <Args, Result>(
  name: string,
  description: string,
  parameters: JSONSchema,
  run: (args: Args) => Promise<Result>,
  requiresConfirmation = false,
): Tool<Args, Result> => ({
  name,
  description,
  parameters,
  requiresConfirmation,
  run,
})

const empty: JSONSchema = {
  type: 'object',
  properties: {},
  additionalProperties: false,
}

export const tools: ToolRegistry = {
  /* ----- Read ----- */
  get_current_page: tool(
    'get_current_page',
    'Return the page the user is currently viewing in Logseq.',
    empty,
    async () => getCurrentPage(),
  ),
  get_page: tool(
    'get_page',
    'Look up a page by name or numeric id.',
    {
      type: 'object',
      properties: {
        identity: {
          type: ['string', 'number'],
          description: 'Page name or numeric id.',
        },
      },
      required: ['identity'],
      additionalProperties: false,
    },
    async ({ identity }: { identity: PageIdentity | number }) =>
      getPage(identity),
  ),
  get_page_blocks: tool(
    'get_page_blocks',
    'Return the full block tree of a page by name.',
    {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    },
    async ({ name }: { name: PageIdentity }) => getPageBlocks(name),
  ),
  get_current_page_blocks: tool(
    'get_current_page_blocks',
    'Return the full block tree of the currently viewed page.',
    empty,
    async () => getCurrentPageBlocks(),
  ),
  get_block: tool(
    'get_block',
    'Look up a block by UUID, optionally including its child blocks.',
    {
      type: 'object',
      properties: {
        uuid: { type: 'string' },
        includeChildren: { type: 'boolean' },
      },
      required: ['uuid'],
      additionalProperties: false,
    },
    async ({
      uuid,
      includeChildren,
    }: {
      uuid: BlockIdentity
      includeChildren?: boolean
    }) => getBlock(uuid, { includeChildren }),
  ),
  get_tag_blocks: tool(
    'get_tag_blocks',
    'Return all blocks carrying the given tag (by name or ident).',
    {
      type: 'object',
      properties: { nameOrIdent: { type: 'string' } },
      required: ['nameOrIdent'],
      additionalProperties: false,
    },
    async ({ nameOrIdent }: { nameOrIdent: string }) =>
      getTagBlocks(nameOrIdent),
  ),
  get_page_linked_refs: tool(
    'get_page_linked_refs',
    'Return all blocks that link to the given page (backlinks), flattened.',
    {
      type: 'object',
      properties: { page: { type: 'string' } },
      required: ['page'],
      additionalProperties: false,
    },
    async ({ page }: { page: PageIdentity }) => getPageLinkedRefs(page),
  ),
  get_tags_by_name: tool(
    'get_tags_by_name',
    'Look up tag entities by name.',
    {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    },
    async ({ name }: { name: string }) => getTagsByName(name),
  ),
  get_user_configs: tool(
    'get_user_configs',
    'Return the active Logseq user configuration (date format, etc.).',
    empty,
    async () => getUserConfigs(),
  ),
  datascript_query: tool(
    'datascript_query',
    `Run a Datascript query against the Logseq DB. Pass the query as an EDN string, e.g. "[:find (count ?p) :where [?p :block/tags ?t] [?t :block/title \\"Source\\"]]".

This graph is the DB version of Logseq (not the file version). Several attributes you may have seen in older Logseq docs are GONE or work differently — using them will either error or silently return nothing:

- Block text: \`:block/title\` (NOT \`:block/content\` — removed in DB).
- Page name with casing: \`:block/title\` (NOT \`:block/original-name\` — renamed). \`:block/name\` is the lowercase index.
- Task status: ref chain via \`:logseq.property/status\` → \`:block/title "Todo"|"Doing"|"Done"\`. \`:block/marker\` is removed.
- Scheduled / deadline dates: do NOT use \`[?b :logseq.property/scheduled ?d]\` in :where (Query Error). Use the ref chain: \`[?b :block/refs ?ref] [?ref :block/journal-day ?d]\`, then add \`:result-transform (fn [r] (distinct r))\` because :block/refs catches all refs on the block.
- Journal day: \`:block/journal-day\` (YYYYMMDD integer). \`:page/journal-day\` is removed.
- Tags: ref chain \`[?b :block/tags ?t] [?t :block/title "TagName"]\` — or for rename-stable lookups, \`[?t :db/ident :logseq.class/Task]\`.
- Created/updated timestamps: \`:logseq.property/created-at\` / \`:logseq.property/updated-at\` (NOT \`:block/created-at\`).
- User-defined properties have stable idents like \`:user.property/<name>-<hash>\` — resolve via resolve_property_ident, do not guess the hash.

If a query returns unexpectedly empty, suspect a file-graph attribute snuck in. Use \`(pull ?b [*])\` on a sample entity to see what attributes it actually has.`,
    {
      type: 'object',
      properties: { query: { type: 'string' } },
      required: ['query'],
      additionalProperties: false,
    },
    async ({ query }: { query: string }) => datascriptQuery(query),
  ),
  resolve_property_ident: tool(
    'resolve_property_ident',
    'Resolve a user-defined property name (e.g. "sources") to its stable `:user.property/<name>-XXXX` ident in this graph. Required before calling upsert_page_property with a user property.',
    {
      type: 'object',
      properties: { humanName: { type: 'string' } },
      required: ['humanName'],
      additionalProperties: false,
    },
    async ({ humanName }: { humanName: string }) =>
      resolvePropertyIdent(humanName),
  ),

  /* ----- Write (require confirmation) ----- */
  create_page: tool(
    'create_page',
    'Create a page if it does not already exist. Property keys should be stable idents (see resolve_property_ident). Date-typed property values may be passed as `YYYY-MM-DD` strings — the plugin auto-creates the matching journal page and stores its reference. Arrays of date strings are also resolved element-by-element. The plugin defaults `redirect: false` so the user is not navigated away from their current Logseq page; you do not need to set it.',
    {
      type: 'object',
      properties: {
        name: { type: 'string' },
        properties: { type: 'object', additionalProperties: true },
        opts: { type: 'object', additionalProperties: true },
      },
      required: ['name'],
      additionalProperties: false,
    },
    async ({
      name,
      properties,
      opts,
    }: {
      name: string
      properties?: Record<string, unknown>
      opts?: CreatePageOpts
    }) => createPage(name, properties ?? {}, opts ?? {}),
    true,
  ),
  create_tag: tool(
    'create_tag',
    'Create a tag entity by name.',
    {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
      additionalProperties: false,
    },
    async ({ name }: { name: string }) => createTag(name),
    true,
  ),
  append_block_in_page: tool(
    'append_block_in_page',
    'Append a SINGLE block to the end of a page. PREFER `append_batch_blocks_to_page` whenever you are writing more than one block to the same page (e.g. a Source page body) — one IPC round trip instead of N. Use this single-block variant only for one-off appends.',
    {
      type: 'object',
      properties: {
        page: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['page', 'content'],
      additionalProperties: false,
    },
    async ({ page, content }: { page: PageIdentity; content: string }) =>
      appendBlockInPage(page, content),
    true,
  ),
  insert_block: tool(
    'insert_block',
    'Insert a SINGLE block as a child of (or sibling to) the given parent block UUID. PREFER `insert_batch_blocks` when you have a tree (multiple siblings, nested children) to write under the same parent — it submits the whole tree in one IPC call and avoids per-block round trips. Use this single-block variant only for one-off inserts where you need the returned uuid right away.',
    {
      type: 'object',
      properties: {
        parentUuid: { type: 'string' },
        content: { type: 'string' },
        sibling: { type: 'boolean' },
        properties: { type: 'object', additionalProperties: true },
      },
      required: ['parentUuid', 'content'],
      additionalProperties: false,
    },
    async ({
      parentUuid,
      content,
      sibling,
      properties,
    }: {
      parentUuid: BlockIdentity
      content: string
      sibling?: boolean
      properties?: Record<string, unknown>
    }) => insertBlock(parentUuid, content, { sibling, properties }),
    true,
  ),
  insert_batch_blocks: tool(
    'insert_batch_blocks',
    'Insert a tree of blocks under a parent block UUID in a single IPC call. PREFERRED over multiple insert_block calls whenever you have more than one block to write — each batch is one round trip regardless of tree depth. `blocks` is an array of `{ content, children? }`; `children` is recursive. Note: `properties` on batch blocks is NOT supported on DB graphs — set properties separately via upsert_block_property after the batch returns. Returns the array of created top-level BlockEntities (with their uuids and children).',
    {
      type: 'object',
      properties: {
        parentUuid: { type: 'string' },
        blocks: {
          type: 'array',
          items: { $ref: '#/$defs/batchBlock' },
        },
        sibling: {
          type: 'boolean',
          description:
            'If true, insert as siblings of parentUuid instead of children.',
        },
        before: {
          type: 'boolean',
          description: 'If true, insert before parentUuid instead of after.',
        },
      },
      required: ['parentUuid', 'blocks'],
      additionalProperties: false,
      $defs: {
        batchBlock: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            children: {
              type: 'array',
              items: { $ref: '#/$defs/batchBlock' },
            },
          },
          required: ['content'],
          additionalProperties: false,
        },
      },
    },
    async ({
      parentUuid,
      blocks,
      sibling,
      before,
    }: {
      parentUuid: BlockIdentity
      blocks: BatchBlock[]
      sibling?: boolean
      before?: boolean
    }) => insertBatchBlocks(parentUuid, blocks, { sibling, before }),
    true,
  ),
  append_batch_blocks_to_page: tool(
    'append_batch_blocks_to_page',
    'Append a tree of blocks to the end of a page by name in a single IPC call. PREFERRED for writing the body of a new Source page or any structured tree to a page. `blocks` is an array of `{ content, children? }` — recursive. Note: properties cannot be set via the batch on DB graphs; set them separately after.',
    {
      type: 'object',
      properties: {
        pageName: { type: 'string' },
        blocks: {
          type: 'array',
          items: { $ref: '#/$defs/batchBlock' },
        },
      },
      required: ['pageName', 'blocks'],
      additionalProperties: false,
      $defs: {
        batchBlock: {
          type: 'object',
          properties: {
            content: { type: 'string' },
            children: {
              type: 'array',
              items: { $ref: '#/$defs/batchBlock' },
            },
          },
          required: ['content'],
          additionalProperties: false,
        },
      },
    },
    async ({
      pageName,
      blocks,
    }: {
      pageName: PageIdentity
      blocks: BatchBlock[]
    }) => appendBatchBlocksToPage(pageName, blocks),
    true,
  ),
  update_block: tool(
    'update_block',
    'Replace a single block\'s content by UUID. Use for targeted edits to one existing block. Do NOT use to append "children" by jamming a multi-line string into content — use insert_block for that.',
    {
      type: 'object',
      properties: {
        uuid: { type: 'string' },
        content: { type: 'string' },
      },
      required: ['uuid', 'content'],
      additionalProperties: false,
    },
    async ({ uuid, content }: { uuid: BlockIdentity; content: string }) =>
      updateBlock(uuid, content),
    true,
  ),
  add_block_tag: tool(
    'add_block_tag',
    'Apply a tag to a block (by UUID).',
    {
      type: 'object',
      properties: {
        block: { type: 'string' },
        tag: { type: 'string' },
      },
      required: ['block', 'tag'],
      additionalProperties: false,
    },
    async ({ block, tag }: { block: BlockIdentity; tag: BlockIdentity }) =>
      addBlockTag(block, tag),
    true,
  ),
  add_page_tag: tool(
    'add_page_tag',
    'Apply a tag to a page by name.',
    {
      type: 'object',
      properties: {
        pageName: { type: 'string' },
        tag: { type: 'string' },
      },
      required: ['pageName', 'tag'],
      additionalProperties: false,
    },
    async ({ pageName, tag }: { pageName: string; tag: string }) =>
      addPageTag(pageName, tag),
    true,
  ),
  upsert_page_property: tool(
    'upsert_page_property',
    'Set a property on a page. The `key` should be a stable ident like `:user.property/sources-XXXX` — resolve it via resolve_property_ident first. For date-typed properties (e.g. `created`, `updated`, `deadline`, `scheduled`), pass the value as a `YYYY-MM-DD` string; the plugin auto-creates the matching journal page and stores its reference. Arrays of date strings are also auto-resolved element-by-element.',
    {
      type: 'object',
      properties: {
        pageName: { type: 'string' },
        key: { type: 'string' },
        value: {},
      },
      required: ['pageName', 'key', 'value'],
      additionalProperties: false,
    },
    async ({
      pageName,
      key,
      value,
    }: {
      pageName: string
      key: string
      value: unknown
    }) => upsertPageProperty(pageName, key, value),
    true,
  ),
  upsert_block_property: tool(
    'upsert_block_property',
    'Set a property on a block by UUID. Use stable idents for user properties (resolve_property_ident). Date-typed properties accept a `YYYY-MM-DD` string; the plugin will auto-create the journal page and store its reference.',
    {
      type: 'object',
      properties: {
        uuid: { type: 'string' },
        key: { type: 'string' },
        value: {},
      },
      required: ['uuid', 'key', 'value'],
      additionalProperties: false,
    },
    async ({
      uuid,
      key,
      value,
    }: {
      uuid: BlockIdentity
      key: string
      value: unknown
    }) => upsertBlockProperty(uuid, key, value),
    true,
  ),

  /* ---------- Plan-gating tools (special-cased in tool-loop.ts) ---------- */
  declare_plan: tool(
    'declare_plan',
    'REQUIRED before any write tool call. Declare the full ordered plan of actions you intend to take on the graph. The user sees a single Approve/Reject card for the whole plan; on Approve, all subsequent writes in this turn proceed without further prompts. `steps` is an array of short human-readable strings describing each step (e.g. "Create #Source page \'Karpathy: LLM Wiki\'", "Append body blocks", "Seed #Concept page \'LLM Wiki Pattern\'", "Add Index entry"). After approval, call mark_plan_step(index, status) after each step.',
    {
      type: 'object',
      properties: {
        steps: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
        },
      },
      required: ['steps'],
      additionalProperties: false,
    },
    async () => {
      throw new Error(
        'declare_plan must be intercepted by tool-loop.ts; raw run() should never be called',
      )
    },
  ),
  mark_plan_step: tool(
    'mark_plan_step',
    'Update the status of a step in the currently approved plan. Call this immediately after finishing (or attempting) each step. `index` is the zero-based index into the steps array you passed to declare_plan. `status` is one of "done" | "failed" | "skipped". `note` is optional context (e.g. error message for failed, reason for skipped).',
    {
      type: 'object',
      properties: {
        index: { type: 'integer', minimum: 0 },
        status: { type: 'string', enum: ['done', 'failed', 'skipped'] },
        note: { type: 'string' },
      },
      required: ['index', 'status'],
      additionalProperties: false,
    },
    async () => {
      throw new Error(
        'mark_plan_step must be intercepted by tool-loop.ts; raw run() should never be called',
      )
    },
  ),
} as unknown as ToolRegistry
