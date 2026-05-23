import { WIKI_INGEST_SKILL } from './ingest'

export { WIKI_INGEST_SKILL } from './ingest'

const QUERY_WORKFLOW = `## /query — answer a question from the graph

a. Use \`datascript_query\` and \`get_page_blocks\` against the graph — read pages, not raw sources.
b. Synthesise an answer citing \`[[Page Name]]\` references.
c. If the answer is substantive, offer to file it as a new \`#Synthesis\` or \`#Question\` page, with the cited pages set as its \`sources\` property (\`resolve_property_ident\` first).
`

const LINT_WORKFLOW = `## /lint — periodic health check

Use \`datascript_query\` to find:
- Pages/blocks tagged \`#Contradiction\` not yet resolved
- Pages with zero inbound references (orphans) — query \`:block/_refs\`
- Terms mentioned in many blocks but lacking their own page (implicit concepts)
- Pages whose sources are superseded by newer \`#Source\` pages (stale claims)
- Open \`#Question\` pages a quick web search could close
- New question candidates spotted while sweeping

For each finding requiring follow-up, file a task on the \`Lint Followups\` page (use \`insert_block\` + a status property — never type TODO into block content). Surface findings before any writes; \`declare_plan\` covering all the writes you intend, then proceed.
`

const LINT_SEEDLINGS_WORKFLOW = `## /lint-seedlings — deep Seedling pass

1. Query all \`#Seedling\` blocks.
2. Per block: read its content. Has a related \`#Concept\` / \`#Entity\` / \`#Source\` emerged since it was written? How old is it?
3. ACROSS blocks: cluster by theme. Three Seedlings circling the same idea = a real signal — recommend writing a \`#Synthesis\` drawing on those.

Per cluster (or notable single block), propose ONE of:
- Promote to a \`#Synthesis\` (most valuable; only when real substance exists).
- Link by adding \`[[references]]\` to existing pages.
- Merge Seedlings on the same theme into one block.
- Leave — still incubating.

Posture: PROPOSE, do not autonomously promote. File each recommendation as a task on \`Lint Followups\`. Bias toward "leave it" for ambiguous cases. The user approves each \`declare_plan\` before any writes happen.
`

const SESSION_START_WORKFLOW = `## /session-start — open-of-session report

The plugin pre-fetches type counts and the last 5 calendar days of journals and includes them in the user message under "Pre-fetched context". Read them, summarise per day (one line each), call out any silent days, and ask what the user wants to do (ingest, query, lint). This is a read-only command — no \`declare_plan\` needed.
`

/**
 * Combined slash-command workflows, intended to live in a cached system block.
 * By moving these out of per-turn user messages, every multi-round wiki
 * operation only pays for them once (cache write), then hits cache on every
 * subsequent round and on every later operation in the same 5-minute window.
 */
export const SLASH_COMMANDS_REFERENCE = `# Slash command workflows

The user invokes these workflows via slash commands in chat. The plugin parses the command, gathers any necessary context (fetched URL, pre-fetched query results, etc.), and includes it in the user message. The body of each workflow lives here so it is cached across turns.

${WIKI_INGEST_SKILL}

---

${QUERY_WORKFLOW}

---

${LINT_WORKFLOW}

---

${LINT_SEEDLINGS_WORKFLOW}

---

${SESSION_START_WORKFLOW}
`
