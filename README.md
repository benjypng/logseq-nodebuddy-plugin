# logseq-nodebuddy-plugin

![Version](https://img.shields.io/github/v/release/benjypng/logseq-nodebuddy-plugin?style=flat-square&color=0969da) ![Downloads](https://img.shields.io/github/downloads/benjypng/logseq-nodebuddy-plugin/total?style=flat-square&color=orange) ![License](https://img.shields.io/github/license/benjypng/logseq-nodebuddy-plugin?style=flat-square)

> Your AI NodeBuddy, right inside your graph. A disciplined knowledge-base maintainer that operates your graph through scoped, plan-gated tool-calling — works with Claude, Gemini, DeepSeek, and local Ollama / LM Studio models.

---

## ✨ Features

- **Wiki Mode, straight away:** the plugin opens directly into an ephemeral chat. NodeBuddy operates your graph as a disciplined knowledge-base maintainer using slash commands and plan-gated tool-calling, driven by **your own** `CLAUDE.md` page.
- **Works with every supported model:** the agentic tool-calling loop runs across Anthropic (API key or OAuth), Google Gemini, DeepSeek, and local Gemma / Qwen — not just Claude.
- **Context Injection:** use `@currentpage`, `@currentweek`, `#tag`, or `[[block reference]]` to pull specific slices of your graph into the prompt, right inside the chat.
- **Per-graph custom instructions:** a `CLAUDE.md` page in your graph becomes the system prompt (cached via Anthropic prompt caching on Claude models).
- **Plan-gated writes:** before any graph write, NodeBuddy declares a plan; you approve the **whole plan once**, then it tracks each step and emits an authoritative completion banner.
- **Persistent session:** the conversation survives minimising and restoring the window; it clears only when Logseq closes or you start a new conversation.
- **Theming + resizable window:** drag the top-left corner (or left edge) to resize; width and height persist across sessions.

### Context Injection + tool-calling (not MCP)

NodeBuddy combines **Explicit Context Injection** with **scoped, plan-gated tool-calling** — not the general MCP protocol.

- **Context Injection:** triggers like `@currentpage`, `[[block reference]]`, or `#tag` deterministically hand specific slices of your graph to the model. Fewer hallucinations, no autonomous browsing.
- **Tool-calling:** the model is given a narrow set of read/write tools (`get_page`, `datascript_query`, `create_page`, `insert_batch_blocks`, `upsert_page_property`, etc.). Before any writes, it must declare a plan; you approve the **whole plan once**, then the plugin tracks each step and emits an authoritative completion banner when the operation ends.

### Currently supported models

- Anthropic: `claude-opus-4-7`, `claude-opus-4-6`, `claude-sonnet-4-6`, `claude-sonnet-4-5-20250929`, `claude-haiku-4-5-20251001`
- Google Gemini: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.5-flash-pro`, `gemini-3-flash-preview`, `gemini-3-pro-preview`
- DeepSeek: `deepseek-v4-pro`, `deepseek-v4-flash`
- Local (Ollama / LM Studio compatible): `gemma2:27b`, `gemma3:27b`, `gemma4:latest`, `qwen3:8b`

Every supported model is wired for the plan-gated tool-calling loop. Note that tool-calling support depends on the model: Claude, Gemini, DeepSeek, and Qwen handle it well, but some local models (notably Gemma via Ollama) ship without a tool-calling template and will error when a tool round is attempted.

## 📸 Screenshots / Demo

![](./demo.gif)

## ⚙️ Installation

1. Open Logseq.
2. Go to the **Marketplace** (Plugins > Marketplace).
3. Search for **logseq-nodebuddy**.
4. Click **Install**.

## 🛠 Usage

### Opening the plugin

- Command palette (`Mod+Shift+P`) → run **Toggle NodeBuddy**, or
- Keyboard shortcut: `Mod+Shift+N`.

NodeBuddy opens as a popup; drag its top-left corner (or left edge) to resize. It opens straight into the chat — there is no home screen or mode picker.

### Setting up your `CLAUDE.md`

NodeBuddy is driven by **your own** `CLAUDE.md` page in the graph (Karpathy-style personal wiki: source pages, concept pages, syntheses, questions, etc.).

1. Create a page titled `CLAUDE.md` in your graph and describe your schema — page types, properties, workflows, hard rules. This page becomes the cached system prompt. **Until it has at least one non-empty block, the chat shows an inline prompt to add one instead of the input box.**
2. Pick any supported model in plugin settings and make sure its API key (or local endpoint) is configured.
3. Open the plugin — that's it.

**Don't have a `CLAUDE.md` yet?** A worked example for a personal wiki (`vaulty`) — Karpathy's LLM Wiki pattern adapted to a Logseq DB graph and to this plugin's tool surface — lives at [`examples/CLAUDE.md`](examples/CLAUDE.md). Paste the contents into a `CLAUDE.md` page in your graph and adapt the focus areas, page types, and conventions to your own workflow. The schema is intentionally opinionated; treat it as a starting point, not a template you must keep verbatim.

The example is written natively for this plugin (tool calls, not shell), enforces the plan-gated write contract (`declare_plan` / `mark_plan_step`), and prefers batched block writes (`append_batch_blocks_to_page`). If you copy it, you get the disciplined-maintainer behaviour straight away.

### Pulling graph context into a prompt

Type any of these triggers in the chat and NodeBuddy injects that slice of your graph, re-queried at send time:

1. **Page Context** — `@currentpage` injects the current page (or zoomed block).
2. **Week Context** — `@currentweek` injects all journal pages for the current week.
3. **Tag Context** — `#meeting`, `#project`, etc. pull every block carrying that tag.
4. **Block Reference Context** — `[[John Smith]]` pulls every block linking that page.

### Slash commands

The session opens with a greeting bubble listing the available commands. The textarea highlights and shows a chip when you type a recognised command (red chip if the command is unknown).

| Command             | What it does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/session-start`    | Snapshot of your graph: page counts by type and the last 5 calendar days of journal activity. Run it manually whenever you want a fresh snapshot.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/ingest <source>`  | Walks the wiki-ingest workflow: summarise → propose pages → on your approval, write the `#Source` page plus seeded `#Concept` / `#Entity` / `#Question` pages and update the `Index`. `<source>` is one of:<br>• **URL** — `/ingest https://example.com/article` (auto-fetched).<br>• **`page:<title>`** — `/ingest page:My Page Title` (promotes an existing graph page in place; keeps its title, adds `#Source` tag + properties).<br>• **`uuid:<uuid>`** — `/ingest uuid:6914813f-…` (tries page first, falls back to block).<br>• **pasted text** — `/ingest some rough notes about X` (the catch-all). |
| `/query <question>` | Answers from your graph (not raw sources), citing `[[Page Name]]` references; offers to file substantive answers as `#Synthesis`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `/lint`             | Health check — orphans, contradictions, stale claims, implicit concepts; files findings as tasks on `Lint Followups`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `/lint-seedlings`   | Deeper pass over `#Seedling` blocks: clusters them by theme and proposes Promote / Link / Merge / Leave for each.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

### Plan-gated approval (the only approval prompt you get)

1. Before touching the graph, NodeBuddy calls `declare_plan(steps)` with the full ordered list of user-visible steps. A **Proposed plan** card appears with **Approve plan** / **Reject** buttons.
2. **Approve plan** unlocks all writes for the rest of the operation — no further prompts. **Reject** sends the rejection back to the model so it can revise and re-declare (or stop).
3. Each step in the plan checklist updates live (○ pending → ◐ running → ✓ done / ✕ failed / – skipped) as the model calls `mark_plan_step` after finishing each one.
4. Individual tool calls still appear as collapsible status cards below the plan, so you can see exactly what was attempted — but with no buttons.
5. When the tool-use loop ends, the plugin emits an authoritative **completion banner** generated from the plan state, not from the model's text: _"Operation complete: 8/8 steps ✅"_ or _"Operation finished: 6/8 ✅, 1 ❌, 1 not marked"_ with per-step details. You don't have to trust the model's closing summary.

Writes attempted without an approved plan are blocked with an inline "blocked" card and the model is told to declare a plan first.

### The conversation

NodeBuddy's chat is ephemeral and held in memory — nothing about the conversation itself is written to your graph (only the graph edits made via approved tool calls persist).

- It **survives minimising and restoring** the window.
- The **New conversation** button (top of the window) clears it back to the greeting.
- It is cleared when **Logseq closes** or the plugin reloads.

### Settings

`Logseq Settings > Plugin Settings > NodeBuddy`:

- **Model Name** — the active model. Any of the supported models works.
- **Gemini API Key** — Google Gemini cloud access.
- **Anthropic API Key or OAuth Token** — accepts a standard API key or a Claude Code OAuth token (auto-detected).
- **DeepSeek API Key** — DeepSeek cloud access.
- **Local Model Endpoint** — OpenAI-compatible endpoint for Gemma / Qwen (default `http://localhost:1234/v1/chat/completions`).
- **Popup Width** / **Popup Height** — size of the NodeBuddy popup in pixels; also adjustable by dragging.
- **CLAUDE.md Page** — page name where your `CLAUDE.md` schema lives (default `CLAUDE.md`).

## ☕️ Support

If you enjoy this plugin, please consider supporting the development.

<div align="center">
  <a href="https://github.com/sponsors/yourusername"><img src="https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?style=for-the-badge&logo=github" alt="Sponsor on Github" /></a>&nbsp;<a href="https://www.buymeacoffee.com/yourusername"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-ffdd00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black" alt="Buy Me a Coffee" /></a>
</div>

## 🤝 Contributing

Issues are welcome. If you find a bug, please open an issue. Pull requests are not accepted at the moment as I am not able to commit to reviewing them in a timely fashion.
