import type {
  BlockEntity,
  BlockIdentity,
  PageEntity,
  PageIdentity,
} from '@logseq/libs/dist/LSPlugin'

import type { Tool, ToolRegistry } from './types'

/* ---------- Read tools ---------- */

export const getCurrentPage = async (): Promise<PageEntity | null> => {
  const page = await logseq.Editor.getCurrentPage()
  return (page as PageEntity | null) ?? null
}

export const getPage = async (
  identity: PageIdentity | number,
): Promise<PageEntity | null> => {
  const page = await logseq.Editor.getPage(identity)
  return page ?? null
}

export const getPageBlocks = async (
  name: PageIdentity,
): Promise<BlockEntity[]> => {
  const blocks = await logseq.Editor.getPageBlocksTree(name)
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
  const refs = await logseq.Editor.getPageLinkedReferences(page)
  if (!refs) return []
  return refs.flatMap(([, blocks]) => blocks)
}

export const getTagsByName = async (name: string): Promise<PageEntity[]> => {
  const tags = await logseq.Editor.getTagsByName(name)
  return tags ?? []
}

export const getUserConfigs = async () => logseq.App.getUserConfigs()

/* ---------- Write tools ---------- */

type CreatePageOpts = Partial<{
  redirect: boolean
  createFirstBlock: boolean
  format: BlockEntity['format']
  journal: boolean
  customUUID: string
}>

export const createPage = async (
  name: string,
  properties: Record<string, unknown> = {},
  opts: CreatePageOpts = {},
): Promise<PageEntity | null> => {
  const page = await logseq.Editor.createPage(name, properties, opts)
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
  const block = await logseq.Editor.appendBlockInPage(page, content)
  return block ?? null
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

/* ---------- Registry (LLM-facing surface for future phases) ---------- */

const tool = <Args, Result>(
  name: string,
  description: string,
  run: (args: Args) => Promise<Result>,
): Tool<Args, Result> => ({ name, description, run })

export const tools: ToolRegistry = {
  get_current_page: tool(
    'get_current_page',
    'Return the page the user is currently viewing in Logseq.',
    async () => getCurrentPage(),
  ),
  get_page: tool(
    'get_page',
    'Look up a page by name or numeric id.',
    async ({ identity }: { identity: PageIdentity | number }) =>
      getPage(identity),
  ),
  get_page_blocks: tool(
    'get_page_blocks',
    'Return the full block tree of a page by name.',
    async ({ name }: { name: PageIdentity }) => getPageBlocks(name),
  ),
  get_current_page_blocks: tool(
    'get_current_page_blocks',
    'Return the full block tree of the currently viewed page.',
    async () => getCurrentPageBlocks(),
  ),
  get_block: tool(
    'get_block',
    'Look up a block by UUID, optionally including its child blocks.',
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
    async ({ nameOrIdent }: { nameOrIdent: string }) =>
      getTagBlocks(nameOrIdent),
  ),
  get_page_linked_refs: tool(
    'get_page_linked_refs',
    'Return all blocks that link to the given page (backlinks), flattened.',
    async ({ page }: { page: PageIdentity }) => getPageLinkedRefs(page),
  ),
  get_tags_by_name: tool(
    'get_tags_by_name',
    'Look up tag entities by name.',
    async ({ name }: { name: string }) => getTagsByName(name),
  ),
  get_user_configs: tool(
    'get_user_configs',
    'Return the active Logseq user configuration (date format, etc.).',
    async () => getUserConfigs(),
  ),
  create_page: tool(
    'create_page',
    'Create a page if it does not already exist.',
    async ({
      name,
      properties,
      opts,
    }: {
      name: string
      properties?: Record<string, unknown>
      opts?: CreatePageOpts
    }) => createPage(name, properties ?? {}, opts ?? {}),
  ),
  create_tag: tool(
    'create_tag',
    'Create a tag entity by name.',
    async ({ name }: { name: string }) => createTag(name),
  ),
  append_block_in_page: tool(
    'append_block_in_page',
    'Append a block to the end of a page.',
    async ({ page, content }: { page: PageIdentity; content: string }) =>
      appendBlockInPage(page, content),
  ),
  update_block: tool(
    'update_block',
    'Replace a block’s content by UUID.',
    async ({ uuid, content }: { uuid: BlockIdentity; content: string }) =>
      updateBlock(uuid, content),
  ),
  add_block_tag: tool(
    'add_block_tag',
    'Apply a tag to a block or page.',
    async ({ block, tag }: { block: BlockIdentity; tag: BlockIdentity }) =>
      addBlockTag(block, tag),
  ),
} as unknown as ToolRegistry
