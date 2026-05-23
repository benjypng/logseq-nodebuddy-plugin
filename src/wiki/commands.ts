import type { LoadedIngestSource } from './load-source'
import { WIKI_INGEST_SKILL } from './skills/ingest'

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

The source is a single block (UUID \`${src.blockUuid}\`) inside the graph. Treat the block content as the source material. Decide with the user whether to:
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

Run the §6 Session Start protocol from the CLAUDE.md schema, using the provided tools:

1. Confirm the graph is reachable (get_user_configs is fine — we already know we're connected).
2. Count pages by each type tag (Source, Concept, Entity, Synthesis, Question) using datascript_query with this query template (substitute each tag):
   [:find (count ?p) :where [?p :block/tags ?t] [?t :block/title "Source"]]
3. Find the last 5 calendar days of journal pages by querying :block/journal-day descending and taking the top 5 with ?day ≤ today. For each present day, call get_page_blocks to read a brief overview. Explicitly note any silent days.
4. Report all five type counts and a one-line summary per journal day, then ask whether I want to ingest, query, or lint.

Pre-fetched context (already retrieved for you):
${extra?.preFetched ?? '(none)'}
`
    case 'ingest': {
      const sourceBlock = extra?.ingestSource
        ? ingestSourceBlock(extra.ingestSource)
        : `# Source for this ingest\n\nNo source was loaded. Args: \`${parsed.args}\`. Ask the user what to ingest.`
      return `[Slash command: /ingest ${parsed.args}]

Use the wiki-ingest skill below. Follow it end-to-end. The CLAUDE.md schema for this graph is already loaded in your system prompt — defer to it on anything not covered here.

${WIKI_INGEST_SKILL}

---

${sourceBlock}
`
    }
    case 'query':
      return `[Slash command: /query ${parsed.args}]

Follow the §8 Query workflow:

a. Use datascript_query and get_page_blocks against the graph — read pages, not raw sources.
b. Synthesise an answer citing [[Page Name]] references.
c. If the answer is substantive, offer to file it as a new #Synthesis or #Question page, with the cited pages set as its sources property (resolve_property_ident first).

Question: ${parsed.args}
`
    case 'lint':
      return `[Slash command: /lint]

Run the §9 Lint pass. Use datascript_query to find:
- Pages/blocks tagged #Contradiction not yet resolved
- Pages with zero inbound references (orphans) — query :block/_refs
- Terms mentioned in many blocks but lacking their own page (implicit concepts)
- Pages whose sources are superseded by newer #Source pages (stale claims)
- Open #Question pages a quick web search could close
- New question candidates spotted while sweeping

For each finding requiring follow-up, propose creating a task with status 'todo' on the Lint Followups page (use insert_block with appropriate properties — never type TODO into block content). Surface findings before doing any writes; wait for my approval on each.
`
    case 'lint-seedlings':
      return `[Slash command: /lint-seedlings]

Run the §9a deep Seedling pass:

1. Query all #Seedling blocks.
2. Per block: read its content. Has a related #Concept / #Entity / #Source emerged since it was written? How old is it?
3. ACROSS blocks: cluster by theme. Three Seedlings circling the same idea = a real signal — recommend writing a #Synthesis drawing on those.

Per cluster (or notable single block), propose ONE of:
- Promote to a #Synthesis (most valuable; only when real substance exists).
- Link by adding [[references]] to existing pages.
- Merge Seedlings on the same theme into one block.
- Leave — still incubating.

Posture: PROPOSE, do not autonomously promote. File each recommendation as a task on Lint Followups. I will approve each move. Bias toward "leave it" for ambiguous cases.
`
  }
}
