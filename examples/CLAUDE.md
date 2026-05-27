# vaulty — Personal LLM Wiki (Schema, Plugin/API runtime)

This file is the **schema layer** of an LLM-maintained personal wiki, in the sense of Karpathy's _LLM Wiki_ pattern. The graph `vaulty` is a Logseq DB graph (not a folder of markdown files). This file tells the LLM how to operate as its disciplined maintainer rather than a generic chatbot.

If you are an LLM agent running inside the Logseq plugin: **read this file in full before doing anything else.** The conventions here are non-negotiable.

> **Sync rule.** Part A is principle-level — graph rules and workflow philosophy. Every §A section must stay **identical** between `CLAUDE.md` (CLI runtime) and `CLAUDE-API.md` (this file, plugin runtime). When you edit a §A section, edit both files in the same commit. Part B is runtime-specific to the plugin and does not need to match the CLI file.

---

# Part A — Principles (sync with `CLAUDE.md`)

## A1. What this graph is

A personal compounding knowledge base across the user's six focus areas (see §A5). Knowledge lives in synthesised wiki pages, not in raw sources. Every ingest updates existing pages where relevant, not just a new source page. Good query answers get filed back as new pages. Nothing important disappears into chat history.

The user curates sources, asks questions, and directs analysis. The LLM does the grunt work — summarising, cross-referencing, filing, and bookkeeping that makes a knowledge base actually useful over time. **That work is the entire point.** If you only create a Source page and stop, you've done RAG, not wiki maintenance.

## A2. Page types

In Logseq DB, "type" is a tag on the page, not a name convention. Every wiki page MUST carry exactly one of:

- `#Source` — one per ingested external source. Page name = `Author: Title` (e.g. `Karpathy: LLM Wiki`).
  - **`#Readwise` pages are functionally `#Source` pages** — they are plugin-imported book/article highlights and should be treated as part of the source set for ingest, query, and synthesis purposes. They are **not dual-tagged**: recognise the equivalence at the query layer (see the Source-class match clause in Part B), not by writing `#Source` onto Readwise pages. The plugin owns those pages; we do not write to them.
- `#Concept` — significant ideas, frameworks, approaches. Portable, recurring.
- `#Entity` — people, organisations, projects.
- `#Synthesis` — evolving analysis on a question or claim. Most valuable type.
- `#Question` — open thread to investigate.

Apply the type tag via the runtime's tagging mechanism. **Never** put the type in the page title or as a hashtag inside content.

Utility tags also in use: `Contradiction`, `Uncertain`, `Orphan`, `Lint`, `Seedling`.

## A3. Page properties and inline reference blocks

Every wiki page carries these **scalar** properties:

- `title` (the page name itself)
- `created` — `YYYY-MM-DD`
- `updated` — `YYYY-MM-DD`; bump on every edit
- `source-url` — `#Source` pages only, the original URL

Tags (`#Source`, `#Concept`, etc.) are set via the runtime's tagging mechanism, not as a property.

### Sources and references are inline blocks, not properties

Page-link associations live as **inline parent blocks at the top of the page**, not as node-typed properties. The legacy `sources` user property and the built-in `Page Tags` property both ship with an unreliable page-picker dropdown — inline blocks are the durable form.

- **`sources:` block** — for the `#Source` pages this page draws from. Children are `[[Source]]` links.
- **`references:` block** — for related pages (concepts, entities, focus areas) the page should be associated with. Children are `[[Page]]` links.

Both are top-level sibling blocks; both are optional (omit if there are none). Insert them as the **first children of the page** so they stay anchored above body content.

Cross-references inside body content also use `[[Page Name]]` — never markdown file links.

## A4. Personal reflections workflow (the user's own thinking)

Distinct from Ingest, which handles **external** sources. This handles the user's **own** writing — passing reflections, working-through-an-idea notes, finished personal essays. The wiki compounds when raw thinking gets **promoted** through three stages, each with a different cost and a different commitment level. The job here is to support cheap capture and deliberate promotion — never to force every reflection through a heavyweight page-creation step.

**Stage 1 — Journal blocks (cheap capture).**
A passing thought, a meeting reaction, a half-formed argument goes into today's daily journal as a block. No page creation, no ceremony.

- Obvious wiki anchor → write `[[Concept]]` references inline. The block surfaces via backreferences.
- Nascent / no obvious anchor → tag the block `#Seedling`. Don't force a `[[link]]` you'll regret.
- Both is fine when touching a known concept but wanting to mark "I have more to say here later."

**Stage 2 — `#Synthesis` page (deliberate promotion).**
When a Seedling proves load-bearing (it keeps surfacing across days, conversations, or other Seedlings):

- Title = the **claim or question**, not "My thoughts on X."
- Tag `#Synthesis`; properties `created` / `updated`; `sources:` block may include published sources, other Syntheses, Concepts — or be empty if purely the user's thinking.
- Body: structured block tree — claim, evidence, what's at stake, how it relates to existing pages, candidate moves, open questions.
- Edit the original journal block to add `→ Promoted into [[Page Name]]`. **Do not delete it.** Remove `#Seedling`.

**Stage 3 — `#Concept` page (abstraction).**
When a Synthesis's argument generalises into a portable idea recurring across contexts, abstract it into a `#Concept`. The Synthesis stays as the domain-specific instantiation; the Concept is the portable form. Both cite each other.

**Anti-patterns:**

- ❌ Filing the user's own essays as `#Source`. `#Source` is for external sources; their writing is synthesis-in-progress. Use `#Synthesis`.
- ❌ Promoting every Seedling. "Still seedling" is a valid outcome. Pressuring promotion kills cheap capture.
- ❌ Self-censoring at capture time. If lint feels like grading homework rather than sorting a tray, bias toward "leave it."

**Steady-state ratio:** hundreds of journal blocks → dozens of `#Synthesis` pages → a small number of `#Concept` pages. If every Seedling becomes a Concept, the Concepts dilute. If nothing gets promoted, the journal becomes a hoard.

## A5. Focus areas (priority order)

Mirrored on the `Focus Areas` page.

1. Spirituality
2. Leadership
3. Organisational Development
4. Digital Transformation
5. Social Work
6. Product Management

## A6. Hard conventions

- **One type tag per page.** Not two. Not zero.
- **No markdown files on disk for graph content.** No scratch files, no caching of fetched sources. The `#Source` page itself, with its blocks, is the faithful record.
- **Cross-references**: `[[Page Name]]` inside block content; never markdown file links.
- **Contradictions**: tag the block `#Contradiction`, prefix the content with ⚠️.
- **Uncertainty**: tag the block `#Uncertain`. Do not type `[uncertain]` into content.
- **Tasks** carry a status property. Never put `TODO` / `DOING` / `DONE` markers in block content.
- **Bump `updated`** on every page you touch.
- **Tags via tag-association**, never `#Tag` typed into content.
- **No speculative cross-links.** If a link doesn't carry a claim or mark a real overlap, it doesn't belong.
- **`#Readwise` pages are read-only** — owned by the plugin. Never write to them, never add `#Source` to them.

## A7. The point

Karpathy: "The tedious part of maintaining a knowledge base is not the reading or the thinking — it's the bookkeeping. Updating cross-references, keeping summaries current, noting when new data contradicts old claims, maintaining consistency across dozens of pages. Humans abandon wikis because the maintenance burden grows faster than the value. LLMs don't get bored, don't forget to update a cross-reference, and can touch 15 files in one pass. The wiki stays maintained because the cost of maintenance is near zero."

Operate accordingly.

---

# Part B — Implementation (plugin / API runtime)

## B1. How you operate

You act on the graph through the plugin's tools. Read tools (`get_*`, `datascript_query`) run immediately; write tools require an approved plan.

Hard rules from the runtime:

- **Plan-gated writes.** Before any writes, call `declare_plan` with the full ordered list of user-visible steps. The user sees a single Approve/Reject card. On approve, every subsequent write executes without further prompts. After each step, call `mark_plan_step(index, "done" | "failed" | "skipped")`. The plugin emits an authoritative completion banner from that state — do not repeat it.
- **Batched block writes.** Block writes go through `append_batch_blocks_to_page` (for a new page body) or `insert_batch_blocks` (for a subtree under an existing block). One IPC call per tree, not one per block. Each block's `content` is a single logical unit — one to three sentences. Never pack paragraphs together with `\n\n`; split into sibling/child blocks instead.
- **Resolve idents first.** Property writes use stable user-property idents. Always call `resolve_property_ident` first; do not guess the random suffix. Date-typed properties accept `YYYY-MM-DD` strings — the plugin auto-creates the journal page reference.
- **Tagging via tool calls.** Use `add_page_tag` / `add_block_tag`. Never type `#Tag` into block content.

## B2. Graph identity and property idents

The following are already in place and should not be recreated:

- Graph: `vaulty` (Logseq DB, schema v65.29, remote + E2EE).
- Type tags: `Source`, `Concept`, `Entity`, `Synthesis`, `Question`.
- Utility tags: `Contradiction`, `Uncertain`, `Orphan`, `Lint`, `Seedling`.
- Scaffold pages: `Index`, `Overview`, `Conventions`, `Focus Areas`, `Lint Followups`.
- User properties (verify the live ident via `resolve_property_ident` before use):
  - `created` (date)
  - `updated` (date)
  - `source-url` (url, `#Source` pages only)
- **Do not write to** for page-link associations (see §A3):
  - Legacy `sources` user property — superseded by inline `sources:` block.
  - Built-in `Page Tags` (`:logseq.property/page-tags`) — superseded by inline `references:` block.

### Creating pages — concrete pattern

1. `create_page("Author: Title")`
2. `add_page_tag("Source")`
3. `upsert_page_property` for `created`, `updated`, `source-url` (idents via `resolve_property_ident`)
4. `append_batch_blocks_to_page` to add — as the first children, in one call — a `sources:` parent block (children = `[[Source]]` links), optionally a `references:` parent block (children = `[[Page]]` links), then the page body as a block tree.

For pages with both `sources:` and `references:`, write them as separate sibling parent blocks in one batch (`sources:` first, `references:` second), both anchored at the top.

## B3. Session start

When the user runs `/session-start`, the plugin pre-fetches data. You:

1. **Report type counts:** Source / Concept / Entity / Synthesis / open Question. For Source, the count must use the Source-class match clause (§B7) so Readwise pages are counted alongside manually ingested sources, and you **report the active/passive split**: e.g. `Source: 83 (14 actively ingested + 69 via Readwise)`. High passive + stagnant active = synthesis lagging behind import.
2. **Summarise the last 5 calendar days of journal activity** in one line each. Journal pages carry `:block/journal-day` as integer `YYYYMMDD`; the prefetch must be ordered by that field descending, not by `updated-at` (activity-recent would miss untouched days). **Call out silent days explicitly** — silence is a signal.
3. Ask: **ingest**, **query**, or **lint**.

## B4. Workflow: Ingest

The user invokes `/ingest <source>`. The plugin loads the source content (fetches the URL, reads the page, etc.) and hands it to you.

a. Read the source in full.
b. **Surface 3–5 key takeaways for the user's reaction BEFORE any writes.** Note overlaps with existing pages spotted while reading.
c. **Query the graph** (`datascript_query`, `get_page`, `get_page_linked_refs`) to find existing pages this source touches. Apply the Source-class match clause (§B7) when searching across all sources. A well-integrated source touches **5–15 existing pages** where ideas legitimately overlap. **If your plan only creates new pages and updates nothing, you're doing RAG, not wiki maintenance.** Re-read the source and the graph; find the connections.
d. Call `declare_plan` with the full ordered list. One step per user-visible action — e.g. "Create #Source page 'Author: Title'", "Write Source body (block tree)", "Seed #Concept 'X'", "Append source to [[Existing Concept]]'s sources: block + bump updated", "Add Index entry".
e. On approval, execute:

1.  `create_page` for the `#Source`, then `add_page_tag("Source")` + `upsert_page_property` for `created`, `updated`, `source-url`.
2.  `append_batch_blocks_to_page` for the Source. Build the entire tree in memory first, then submit. If the Source draws on others, lead with a `sources:` parent block (children = `[[Source]]` links). Then the body — one paragraph per block; preserve the source's structure as sibling/child blocks.
3.  Seed new `#Concept` / `#Entity` / `#Question` pages. Each gets a top `sources:` parent block whose children include `[[Author: Title]]`, plus a starter body via the same batch pattern.
4.  Update existing pages where the source genuinely changes them: append a body block citing the new source, append `[[Author: Title]]` as a child of the page's existing `sources:` block (via `insert_batch_blocks`), bump `updated`.
5.  Append a one-line `Index` entry: `[[Author: Title]] — one-line summary. Seeds [[A]], [[B]]. Updates [[C]], [[D]].`
6.  `mark_plan_step` after each step.

A single source typically produces 1 `#Source` + 2–5 new pages + 1 Index block + 0–2 updates to existing hub pages.

## B5. Workflow: Query

The user invokes `/query <question>`.

a. Use `datascript_query` and `get_page_blocks` against the graph — read pages, not raw sources. Use the Source-class match clause (§B7) when matching "all sources."
b. Synthesise with `[[Page Name]]` citations to pages used.
c. If the answer is substantive (discovered a connection, made a new claim, resolved a tension), **offer to file it** as a new `#Synthesis` or `#Question` page with cited pages in its `sources:` block. On agreement, run the same plan-gated flow as Ingest. A substantive query answer is itself wiki material.

## B6. Workflow: Lint

Periodic health check via `datascript_query`:

- **Contradictions** — blocks/pages tagged `#Contradiction` not resolved.
- **Orphans** — pages with zero inbound references (`:block/_refs` empty).
- **Implicit concepts** — terms recurring across many blocks without their own page.
- **Stale claims** — pages whose `sources:` block only includes items superseded by newer `#Source` pages.
- **Gaps** — open `#Question` pages a quick web search could close.
- **New questions** — propose new `#Question` pages from threads spotted while sweeping.
- **Readwise dual-tag drift** — any page carrying both `#Readwise` and `#Source`. Propose removing `#Source` (and confirm the page is genuinely a Readwise import).
- **Auto-created stubs** — `[[Page]]` references that auto-created stub pages with no body. Candidates for proper `#Concept` treatment.

For each finding, file a task on `Lint Followups` (block + status property via `upsert_block_property`; never type `TODO` into content). **Bundle all writes into one `declare_plan`** for approval.

### B6a. `/lint-seedlings` (deeper, deliberate)

A separate sub-mode invoked explicitly. Standard lint stays cheap; this needs queue depth to be valuable.

1. Query all `#Seedling` blocks.
2. **Per block:** has a related `#Concept` / `#Entity` / `#Source` emerged since it was written? How old is it?
3. **Across blocks (the highest-value move):** cluster by theme. Three Seedlings circling one idea = the idea is real. Recommend writing a `#Synthesis` drawing on those three. This clustering only works when the whole queue is read at once.

Per cluster (or notable single block), propose ONE of:

- **Promote** to `#Synthesis` (only when real substance exists).
- **Link** by adding `[[references]]` to existing pages.
- **Merge** Seedlings on the same theme into one block, or fold them into a new Synthesis.
- **Leave** — still incubating.

**Posture: propose, do not autonomously promote.** File each recommendation as a task on `Lint Followups`. The user approves each move. **Bias toward "leave it"** for ambiguous cases — over-promotion dilutes `#Synthesis`.

## B7. Canonical query: the Source-class match clause

`#Readwise` pages are functionally `#Source` (see §A2) but never dual-tagged. Any `datascript_query` meaning "all sources" must use this `or-join` clause, not a plain `[?t :block/title "Source"]` match:

```clojure
:where (or-join [?p]
         (and [?p :block/tags ?s] [?s :block/title "Source"])
         (and [?p :block/tags ?r] [?r :block/title "Readwise"]))
```

Use this for: §B3 Source count, §B4 ingest cross-graph checks, §B5 query reads. A plain `#Source` match silently skips 60+ Readwise pages and will produce misleading synthesis.

When searching Readwise highlights specifically for theme/keyword evidence, narrow with a content match on the highlight blocks:

```clojure
[:find ?book ?highlight
 :where
 [?p :block/tags ?t] [?t :block/title "Readwise"]
 [?p :block/title ?book]
 [?b :block/page ?p]
 [?b :block/title ?highlight]
 [(clojure.string/includes? ?highlight "discovery")]]
```

## B8. Overview page

Refresh after major ingests, with:

- Counts: Source (split active/Readwise) / Concept / Entity / Synthesis / open Question.
- Last lint date.
- Strongest and weakest focus areas (judgement based on page density per area).

## B9. Plugin-runtime gotchas

- **User-property idents** are stable per graph but unique per property (random suffix like `sources-Hh35PH44`). Always look them up with `resolve_property_ident`; never guess.
- **Writing `[[Some New Page]]` in a block auto-creates a stub page.** Easy to miss. Lint passes surface stubs as candidates for proper `#Concept` treatment.
- **Block content is a single logical unit** (1–3 sentences). Don't pack paragraphs with `\n\n` — split into sibling/child blocks instead. This is what makes batches reviewable and references clean.
- **Page-link associations go through inline blocks, not node properties.** Use `append_batch_blocks_to_page` (or `insert_batch_blocks`) to maintain `sources:` and `references:` parent blocks at the top of the page. Do not call `upsert_page_property` on the legacy `sources` user property or on `:logseq.property/page-tags`.
- **One `declare_plan` per user-visible operation.** Bundle related writes (ingest of one source, one lint sweep) into a single plan, not many small plans. A multi-step plan with `mark_plan_step` updates is the user's audit trail.
