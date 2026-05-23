import type { LoadedIngestSource } from './load-source'

export type WikiCommand =
  | 'ingest'
  | 'query'
  | 'lint'
  | 'lint-seedlings'
  | 'session-start'

export interface ParsedCommand {
  cmd: WikiCommand
  args: string
  raw: string
}

const COMMAND_NAMES: WikiCommand[] = [
  'ingest',
  'query',
  'lint-seedlings',
  'lint',
  'session-start',
]

export const parseSlashCommand = (input: string): ParsedCommand | null => {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return null
  const body = trimmed.slice(1)
  for (const name of COMMAND_NAMES) {
    if (body === name || body.startsWith(`${name} `)) {
      const args = body.slice(name.length).trim()
      return { cmd: name, args, raw: trimmed }
    }
  }
  return null
}

const ingestSourceBlock = (src: LoadedIngestSource): string => {
  switch (src.kind) {
    case 'logseq-page':
      return `# Source for this ingest — EXISTING GRAPH PAGE

The source is an existing page in this graph. Do NOT create a new \`#Source\` page; instead, PROMOTE this page in place:
- Keep its existing title (\`${src.title}\`). Do not rename it.
- Page UUID: \`${src.pageUuid}\`
- Apply the \`#Source\` tag via \`add_page_tag\` (only if not already tagged).
- Set the \`created\` / \`updated\` properties; \`source-url\` is optional (omit if there is no external URL).
- Seed \`#Concept\` / \`#Entity\` / \`#Question\` pages from this page's content, with \`sources: ["${src.title}"]\`.
- Add the \`Index\` entry as normal.

Page content (block tree, flattened):
---
${src.text || '(empty page)'}
---
`
    case 'logseq-block':
      return `# Source for this ingest — EXISTING GRAPH BLOCK

The source is a single block (UUID \`${src.blockUuid}\`) inside the graph. Decide with the user whether to:
  (a) promote the block's parent page to a \`#Source\` page (see logseq-page handling), or
  (b) create a new \`#Source\` page that summarises this block's content.
Default to (b) unless the user signals (a).

Block content (subtree, flattened):
---
${src.text || '(empty block)'}
---
`
    case 'url':
      return `# Source for this ingest

Source URL: ${src.identifier}

Fetched content:
---
${src.text}
---
`
    case 'inline':
      return `# Source for this ingest

The user did not provide a URL or graph reference. Treat the following as the source text; if it is too short or ambiguous, ask the user to clarify before any writes.

---
${src.text}
---
`
  }
}

/**
 * Per-command user-message body. The workflow instructions live in the
 * cached system prompt (SLASH_COMMANDS_REFERENCE); these messages are
 * intentionally thin so they don't re-tokenise the workflow on every turn.
 */
export const buildCommandPrompt = (
  parsed: ParsedCommand,
  extra?: {
    ingestSource?: LoadedIngestSource
    preFetched?: string
  },
): string => {
  switch (parsed.cmd) {
    case 'session-start':
      return `[Slash command: /session-start]

Follow the /session-start workflow in your system prompt.

Pre-fetched context:
${extra?.preFetched ?? '(none)'}
`
    case 'ingest': {
      const sourceBlock = extra?.ingestSource
        ? ingestSourceBlock(extra.ingestSource)
        : `# Source for this ingest\n\nNo source was loaded. Args: \`${parsed.args}\`. Ask the user what to ingest.`
      return `[Slash command: /ingest ${parsed.args}]

Follow the /ingest workflow (Wiki Ingest skill) in your system prompt against the source below. Remember: \`declare_plan\` first, then execute.

${sourceBlock}
`
    }
    case 'query':
      return `[Slash command: /query ${parsed.args}]

Follow the /query workflow in your system prompt.

Question: ${parsed.args}
`
    case 'lint':
      return `[Slash command: /lint]

Follow the /lint workflow in your system prompt.
`
    case 'lint-seedlings':
      return `[Slash command: /lint-seedlings]

Follow the /lint-seedlings workflow in your system prompt.
`
  }
}
