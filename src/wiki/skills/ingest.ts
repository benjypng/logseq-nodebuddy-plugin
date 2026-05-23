// Wiki-ingest skill — instructs Claude on the §7 Ingest workflow.
// All graph access happens through the tools exposed by src/mcp/tools.ts
// (create_page, append_block_in_page, insert_block, upsert_page_property,
// add_page_tag, datascript_query, resolve_property_ident, etc.). The skill
// never references any shell.

export const WIKI_INGEST_SKILL = `# Wiki Ingest

You are ingesting **external sources** into the user's Logseq DB graph (default: \`vaulty\`). The graph stores wiki content as pages and blocks in the Logseq database — not as markdown files on disk. Every operation goes through the read and write tools available to you.

This skill governs **external sources only**. The user's own reflections, journal entries, and in-progress thinking are handled by the personal-reflection workflow (Seedling → Synthesis → Concept) defined in their CLAUDE.md (§7a). If the user is asking you to file their own writing, stop and use that workflow instead.

Available tools, by purpose:
- **Read:** \`get_current_page\`, \`get_page\`, \`get_page_blocks\`, \`get_block\`, \`get_tag_blocks\`, \`get_page_linked_refs\`, \`get_tags_by_name\`, \`datascript_query\`.
- **Property idents:** \`resolve_property_ident\` (always call this before \`upsert_page_property\` / \`upsert_block_property\` for any \`:user.property/*\` key).
- **Write (require inline approval):** \`create_page\`, \`add_page_tag\`, \`add_block_tag\`, \`append_block_in_page\`, \`insert_block\`, \`update_block\`, \`upsert_page_property\`, \`upsert_block_property\`, \`create_tag\`.

---

## Step 1: Read the source in full

The fetched source content is provided inline at the bottom of this message. Read it completely before writing anything.

For each source, identify:

a. Main arguments, claims, and frameworks.
b. Decisions, outcomes, and concrete recommendations.
c. Open questions and unresolved tensions.
d. People, organisations, and projects worth surfacing as \`#Entity\` pages.
e. Reference data, statistics, or quotes worth preserving verbatim.
f. Any contradictions with what the user has already filed in the graph (you will need to query to know this — see Step 2c).

Do not create or update any graph entity yet.

---

## Step 2: Plan the ingest, then surface it for the user's reaction

This is the critical pause. Nothing is written until the user confirms.

a. **Propose a \`#Source\` page title.** Convention is \`Author: Title\` for articles and books (e.g. \`Karpathy: LLM Wiki\`, \`White: The Product Manager\`). For URLs without a clear author, use \`Site: Title\`. Avoid generic titles.

b. **Propose 3 to 5 key takeaways** from the source, in the user's own register. These are what they will react to. Keep each takeaway to one or two sentences. State the claim, not the metaphor around it.

c. **Check the graph for existing relevant pages.** Use \`datascript_query\` to find pages whose titles match terms from the source, and to find pages already tagged with one of the proposed \`#Concept\` or \`#Entity\` titles. Report what you found. The point is to avoid creating duplicate Concept pages and to flag where this source updates an existing page rather than seeds a new one.

d. **Propose the ingest plan.** List, in this order:

   i. The new \`#Source\` page (title, focus area it belongs to).
   ii. New \`#Concept\` pages to seed (typically 2 to 5).
   iii. New \`#Entity\` pages to seed, if any.
   iv. New \`#Question\` pages to seed, if any.
   v. Existing pages to update (with one line per page explaining the update).
   vi. A one-line \`Index\` entry summarising the source.

e. **Surface the proposed plan as chat text, then submit it via \`declare_plan\`** with one entry per user-visible step in the order you intend to execute. The user sees a single Approve/Reject card. If they reject, the tool_result tells you so — ask what to change and either re-declare a revised plan or abandon. Do NOT call any write tools before \`declare_plan\` returns approved.

f. **After approval, execute the plan.** No further per-write prompts will appear. After finishing each step, call \`mark_plan_step(index, "done")\` — or \`"failed"\`/\`"skipped"\` with a \`note\` explaining why. The plugin emits an authoritative completion banner after your turn ends.

---

## Step 3: Create the \`#Source\` page

The \`#Source\` page is the faithful record of the source. It replaces the MOC role from older versions of this skill — there is no separate MOC file.

a. **Look up the stable property idents for this graph.** Call \`resolve_property_ident\` for each of: \`sources\`, \`created\`, \`updated\`, \`source-url\`. The vaulty README §3 lists known idents, but always verify in case the user is operating a different graph.

   For date-typed properties like \`created\` and \`updated\`, pass the value as a plain \`YYYY-MM-DD\` string to \`upsert_page_property\` — the plugin will ensure the matching journal page exists and store its reference. Do NOT pass a raw string into a date property without the YYYY-MM-DD format; you'll get a validation error.

b. **Create the page, then set its tag and properties.**
   1. \`create_page\` with the proposed title.
   2. \`add_page_tag\` with \`"Source"\`.
   3. \`upsert_page_property\` for each of \`created\`, \`updated\`, \`source-url\` (use the idents from step 3a).
   Type tag goes through \`add_page_tag\`, never in the page title or in block content. The \`sources\` property on a \`#Source\` page itself is left empty — a source does not cite itself. \`source-url\` only applies to \`#Source\` pages.

c. **Add the content as a block tree — never as one giant block.** Each logical section, paragraph, bullet, or quoted passage is its own block.

   - **Use \`append_batch_blocks_to_page\` for the whole body.** Build the entire tree in memory as a recursive \`[{ content, children: [...] }]\` array, then submit once. This is one IPC call instead of one per block.
   - Single-block helpers (\`append_block_in_page\`, \`insert_block\`) are only for the rare case where you need a returned uuid before deciding what to write next.
   - One block's \`content\` string should be a single logical unit — typically one to three sentences. If it contains \`\\n\\n\` or several bullet markers, you are doing it wrong: split it across children.
   - Properties on batch blocks are unsupported in DB graphs — set per-block properties via \`upsert_block_property\` after the batch returns (the response includes each created block's uuid).

   The block tree is the faithful summary; it must preserve:

   i. The main arguments, in the source's order.
   ii. Direct quotes that carry the argument. Honour fair-use limits: prefer paraphrase, keep any quote short, cite at most once per source.
   iii. Concrete data, numbers, and named entities.
   iv. Open questions the source itself raises.

   Use \`[[Page Name]]\` cross-references inside block content for any \`#Concept\`, \`#Entity\`, or \`#Question\` pages you are about to create. Logseq will auto-create the page stubs; you will overwrite them in Step 4 with proper type tags and properties.

---

## Step 4: Seed the \`#Concept\`, \`#Entity\`, and \`#Question\` pages

For each non-Source page named in your plan:

a. **Create the page with the right type tag.** Concepts and Entities are durable; Questions are open threads to be resolved later.
   1. \`create_page\` with the page title.
   2. \`add_page_tag\` with the appropriate type (\`"Concept"\`, \`"Entity"\`, or \`"Question"\`).
   3. \`upsert_page_property\` for \`created\`, \`updated\`, and \`sources\` (idents from \`resolve_property_ident\`).

   The \`sources\` property takes page names as plain strings in a vector: \`["Author: Source Title"]\`. Do not use EDN page-name maps like \`[[:block/title "..."]]\` — \`node\`-typed properties reject them. (vaulty README §13.)

b. **Add a starter block tree.** For a \`#Concept\` page, the convention is:

   i. A one-block claim of what the concept is.
   ii. Evidence or examples drawn from the source, with \`[[Author: Source Title]]\` references.
   iii. Open questions or tensions, if any.

   For a \`#Question\` page, the convention is:

   i. The question stated as a question, in one block.
   ii. What is known, with \`[[Source]]\` references.
   iii. What would need to be true to resolve it.

   For an \`#Entity\` page (a person, organisation, or project):

   i. One block on what or who they are.
   ii. Their stake in the focus areas this graph cares about.
   iii. Links to relevant \`[[Concept]]\` and \`[[Source]]\` pages.

c. **Keep pages atomic.** One concept per page, one entity per page, one question per page. If a single block lists four unrelated points, split it across pages.

d. **Mark uncertainty explicitly.** Tag any speculative block \`#Uncertain\` via \`add_block_tag\`. Do not type \`[uncertain]\` into block content.

e. **Mark contradictions.** If a block contradicts something you found in another page during Step 2c, tag the block \`#Contradiction\` via \`add_block_tag\` and prefix the block content with ⚠️. File a follow-up task on \`Lint Followups\` (Step 7).

---

## Step 5: Update existing pages where the source genuinely changes them

For each existing page named in Step 2d.v:

a. Read the page first with \`get_page_blocks\` so you know what is already there.

b. Add new blocks via \`append_block_in_page\` or \`insert_block\` that integrate the new source's contribution. Reference the new \`[[Author: Source Title]]\` page. Do not duplicate content that is already on the page.

c. Append the new \`#Source\` page name to the page's \`sources\` property. \`upsert_page_property\` replaces the property value, so you must pass the full new list of sources, not just the addition. Read the existing value first (via \`get_page\`) if you are unsure.

d. **Bump \`updated\`** via \`upsert_page_property\` on every page you touch. This is a hard rule.

e. **No speculative cross-links.** If you find yourself adding a \`[[reference]]\` because two pages "feel related", stop. The link has to do real work — either it carries a claim, or it does not belong.

---

## Step 6: Add the \`Index\` entry

The \`Index\` page is the chronological roll-call of every source in the graph.

\`append_block_in_page\` against the \`Index\` page with content of the form:

\`[[Author: Source Title]] — one-line summary of the source. Seeds [[Concept A]], [[Concept B]]. Updates [[Existing Concept]].\`

One block per source. The block content carries the cross-references; do not embed them as separate sub-blocks.

---

## Step 7: Quality check before reporting back

Run through this list yourself before saying "done":

a. **Type tag on every new page.** Exactly one of \`#Source\`, \`#Concept\`, \`#Entity\`, \`#Synthesis\`, \`#Question\`. Verify with \`get_page\` for each.

b. **\`updated\` bumped on every touched page**, including ones you only added a block to.

c. **\`sources\` populated on every non-Source page** with the names of the \`#Source\` pages it draws from, as plain strings in a vector.

d. **No \`TODO\`/\`DOING\`/\`DONE\` in block content.** Any task goes through a status property on a block on the \`Lint Followups\` page.

e. **Cross-references use \`[[Page Name]]\`**, not markdown links.

f. **Contradictions tagged and ⚠️-prefixed**, with a Lint Followups task filed.

g. **Auto-created stub pages caught.** When you write \`[[Some New Page]]\` in a block and that page does not yet exist, Logseq creates a stub. If you intended that page to be a \`#Concept\`, make sure you upserted it properly with the type tag in Step 4. Easy to miss.

---

## Step 8: Closing message

The plugin emits an authoritative completion banner from the plan + \`mark_plan_step\` state — you do NOT need to repeat the per-step status list in your closing message. Use the closing message instead for:

- Anything surprising the user should know (a contradiction you flagged, an existing duplicate you merged into, a decision you made).
- A short summary of what was added that doesn't map cleanly to any one step (e.g. "Index now points at 14 sources").
- Follow-up suggestions (e.g. "Worth running /lint-seedlings — the new Concept page connects to 3 existing Seedlings").

If the source itself could not be ingested at all (paywalled, 404, binary, requires login), you should NOT have called \`declare_plan\`. Tell the user the reason in chat and stop.

---

## Hard rules (do not violate)

These mirror the vaulty README §12. If anything in this skill appears to conflict with the README, the README wins.

a. **No markdown files on disk for graph content.** You cannot write to disk from this plugin anyway — every write goes through the tools.
b. **Cross-references use \`[[Page Name]]\`**, never \`[text](file.md)\`.
c. **Tag updates always go through \`add_block_tag\` or \`add_page_tag\`** — never type \`#Tag\` into block content.
d. **One type tag per page.** Not two. Not zero.
e. **Tasks** go through a status property on a block. Never put \`TODO\`/\`DOING\`/\`DONE\` markers in block content.
f. **Type tags and core property idents** listed in the README §3 already exist. Do not recreate them.
g. **\`node\`-typed properties** (like \`sources\`) take plain strings in a vector, not EDN page-name maps.

---

## What this skill is not for

a. **The user's own reflections, essays, or in-progress thinking.** Use the Seedling → Synthesis → Concept workflow in README §7a instead.
b. **Filing a query answer.** When you produce a substantive answer from the graph, follow README §8: offer to file it as a \`#Synthesis\` or \`#Question\` page.
c. **Lint passes.** Health checks across the whole graph are README §9. Do not fold lint work into an ingest.
`
