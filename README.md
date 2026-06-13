# logseq-nodebuddy-plugin

![Version](https://img.shields.io/github/v/release/benjypng/logseq-nodebuddy-plugin?style=flat-square&color=0969da) ![Downloads](https://img.shields.io/github/downloads/benjypng/logseq-nodebuddy-plugin/total?style=flat-square&color=orange) ![License](https://img.shields.io/github/license/benjypng/logseq-nodebuddy-plugin?style=flat-square)

> Your AI NodeBuddy, right inside your graph. Supports cloud and local models, with an opt-in **Wiki Mode** that lets Claude maintain a personal knowledge base for you.

---

## ✨ Features

- **Two modes from a single sidebar:**
  - **Chat Mode** — quick conversations with rich graph context. Every session is saved as a Logseq page you can resume later.
  - **Wiki Mode** — Claude operates your graph as a disciplined knowledge-base maintainer using slash commands and tool-calling. Conversation is ephemeral; only the graph writes persist.
- **Context Injection:** Use `@currentpage`, `@currentweek`, `#tag`, or `[[block reference]]` to pull specific slices of your graph into the prompt.
- **Per-graph custom instructions:** A `CLAUDE.md` page in your graph becomes the system prompt (cached via Anthropic prompt caching on Claude models).
- **Local and cloud models:** Anthropic (API key or OAuth), Google Gemini, plus local Ollama/LM Studio endpoints for Gemma and Qwen.
- **Theming + resizable sidebar:** Drag the left edge to resize; width persists across sessions.

### Context Injection vs MCP

NodeBuddy relies on **Explicit Context Injection** for Chat Mode and **scoped tool-calling** for Wiki Mode — not the general MCP protocol.

- **Context Injection (Chat Mode):** Triggers like `@currentpage`, `[[block reference]]`, or `#tag` deterministically hand specific slices of your graph to the LLM. Fewer hallucinations, no autonomous browsing.
- **Tool-calling (Wiki Mode):** Claude is given a narrow set of read/write tools (`get_page`, `datascript_query`, `create_page`, `insert_batch_blocks`, `upsert_page_property`, etc.). Before any writes, Claude must declare a plan; you approve the **whole plan once**, then the plugin tracks each step and emits an authoritative completion banner when the operation ends.

### Currently supported models

- Anthropic: `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-sonnet-4-5-20250929`, `claude-haiku-4-5-20251001` (any Claude model is required for Wiki Mode)
- Google Gemini: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-flash-pro`, `gemini-3-flash-preview`, `gemini-3-pro-preview`
- Local (Ollama / LM Studio compatible): `gemma2:27b`, `gemma3:27b`, `gemma4:latest`, `qwen3:8b`

## 📸 Screenshots / Demo

![](./demo.gif)

## ⚙️ Installation

1. Open Logseq.
2. Go to the **Marketplace** (Plugins > Marketplace).
3. Search for **logseq-nodebuddy**.
4. Click **Install**.

## 🛠 Usage

### Opening the plugin

- Command palette (`Mod+Shift+P`) → `NodeBuddy: Toggle Sidebar`, or
- Keyboard shortcut: `Mod+Shift+N`.

The sidebar opens on the right; drag its left edge to resize.

### Chat Mode

Pick **Start new chat** (or **Name it yourself**, or resume an existing chat) from the home screen.

1. **Page Context** — type `@currentpage` to inject the current page (or zoomed block).
2. **Week Context** — type `@currentweek` to inject all journal pages for the current week.
3. **Tag Context** — type `#meeting`, `#project`, etc. to pull every block carrying that tag.
4. **Block Reference Context** — type `[[John Smith]]` to pull every block linking that page.

Each Chat Mode session creates a Logseq page tagged with your configured session tag (default `NodeBuddy`). Don't manually edit these pages — the plugin uses them to rehydrate conversations on reopen.

### Wiki Mode

Wiki Mode turns NodeBuddy into a maintainer for a personal LLM wiki (Karpathy-style: source pages, concept pages, syntheses, questions, etc.) driven by **your own** `CLAUDE.md` page in the graph.

**Setup:**

1. Create a page titled `CLAUDE.md` in your graph and describe your schema — page types, properties, workflows, hard rules. This page becomes the cached system prompt. Don't skip this — the **Start Wiki Mode** button is disabled until `CLAUDE.md` has content.
2. Select a Claude model in plugin settings (Wiki Mode requires tool-calling).
3. From the home screen, click **Start Wiki Mode**.

**Don't have a `CLAUDE.md` yet?** A worked example for a personal wiki (`vaulty`) — Karpathy's LLM Wiki pattern adapted to a Logseq DB graph and to this plugin's tool surface — lives at [`examples/CLAUDE.md`](examples/CLAUDE.md). Paste the contents into a `CLAUDE.md` page in your graph and adapt the focus areas, page types, and conventions to your own workflow. The schema is intentionally opinionated; treat it as a starting point, not a template you must keep verbatim.

The example is written natively for this plugin (tool calls, not shell), enforces the plan-gated write contract (`declare_plan` / `mark_plan_step`), and prefers batched block writes (`append_batch_blocks_to_page`). If you copy it, you get the disciplined-maintainer behaviour straight away.

**What's different from Chat Mode:**

- The conversation is **state-only** and disappears when the sidebar closes — no Logseq page is created or written for the chat itself.
- The session opens with a greeting bubble listing the available slash commands. The textarea highlights and shows a chip when you type a recognised command (red chip if the command is unknown).
- Slash commands are enabled:

| Command             | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/session-start`    | Snapshot of your graph: page counts by type and the last 5 calendar days of journal activity. Run it manually whenever you want a fresh snapshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/ingest <source>`  | Walks the wiki-ingest workflow: summarise → propose pages → on your approval, write the `#Source` page plus seeded `#Concept` / `#Entity` / `#Question` pages and update the `Index`. `<source>` is one of:<br>• **URL** — `/ingest https://example.com/article` (auto-fetched).<br>• **`page:<title>`** — `/ingest page:My Page Title` (promotes an existing graph page in place; keeps its title, adds `#Source` tag + properties).<br>• **`uuid:<uuid>`** — `/ingest uuid:6914813f-…` (tries page first, falls back to block).<br>• **pasted text** — `/ingest some rough notes about X` (the catch-all). |
| `/query <question>` | Answers from your graph (not raw sources), citing `[[Page Name]]` references; offers to file substantive answers as `#Synthesis`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/lint`             | Health check — orphans, contradictions, stale claims, implicit concepts; files findings as tasks on `Lint Followups`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `/lint-seedlings`   | Deeper pass over `#Seedling` blocks: clusters them by theme and proposes Promote / Link / Merge / Leave for each.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

**Plan-gated approval (the only approval prompt you get):**

1. Before touching the graph, Claude calls `declare_plan(steps)` with the full ordered list of user-visible steps. A **Proposed plan** card appears with **Approve plan** / **Reject** buttons.
2. **Approve plan** unlocks all writes for the rest of the operation — no further prompts. **Reject** sends the rejection back to Claude so it can revise and re-declare (or stop).
3. Each step in the plan checklist updates live (○ pending → ◐ running → ✓ done / ✕ failed / – skipped) as Claude calls `mark_plan_step` after finishing each one.
4. Individual tool calls still appear as collapsible status cards below the plan, so you can see exactly what was attempted — but with no buttons.
5. When the tool-use loop ends, the plugin emits an authoritative **completion banner** generated from the plan state, not from Claude's text: _"Operation complete: 8/8 steps ✅"_ or _"Operation finished: 6/8 ✅, 1 ❌, 1 not marked"_ with per-step details. You don't have to trust the model's closing summary.

Writes attempted without an approved plan are blocked with an inline "blocked" card and Claude is told to declare a plan first.

### Settings

`Logseq Settings > Plugin Settings > NodeBuddy`:

- **Gemini API Key** — Google Gemini cloud access.
- **Anthropic API Key or OAuth Token** — accepts a standard API key or a Claude Code OAuth token (auto-detected).
- **Local Model Endpoint** — OpenAI-compatible endpoint for Gemma / Qwen (default `http://localhost:1234/v1/chat/completions`).
- **Model** — the active model. Wiki Mode requires a `claude-…` selection.
- **NodeBuddy Page Tag** — tag used to identify Chat Mode session pages (default `NodeBuddy`).
- **Sidebar Width** — pixel width of the sidebar; also adjustable by dragging the left edge.

## ☕️ Support

If you enjoy this plugin, please consider supporting the development.

<div align="center">
  <a href="https://github.com/sponsors/yourusername"><img src="https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=for-the-badge&logo=github" alt="Sponsor on Github" /></a>&nbsp;<a href="https://www.buymeacoffee.com/yourusername"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee" /></a>
</div>

## 🤝 Contributing

Issues are welcome. If you find a bug, please open an issue. Pull requests are not accepted at the moment as I am not able to commit to reviewing them in a timely fashion.
