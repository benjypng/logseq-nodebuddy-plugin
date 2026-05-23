import { dropWhile } from 'lodash'

import {
  formatCustomInstructions,
  getBaseScaffoldPrompt,
  getClaudeMdInstructions,
  getWikiScaffoldPrompt,
} from '../constants'
import { tools as toolRegistry } from '../mcp'
import type {
  ChatMessage,
  ClaudeContentBlock,
  ClaudeResponse,
  PlanState,
  PlanStep,
  PlanStepStatus,
  ToolCall,
  ToolCallCallbacks,
} from '../types'
import { formatPromptWithContext, getModelNameFromSettings } from '../utils'
import { SLASH_COMMANDS_REFERENCE } from '../wiki'
import { api, getAnthropicApiKeyFromSettings, isAnthropicOAuthToken } from '.'

const CLAUDE_CODE_OAUTH_SYSTEM_PREFIX =
  "You are Claude Code, Anthropic's official CLI for Claude."

const MAX_TOOL_ROUNDS = 20

interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

const buildSystem = async (
  useOAuth: boolean,
  wikiMode: boolean,
): Promise<SystemBlock[]> => {
  const blocks: SystemBlock[] = []
  if (useOAuth) {
    blocks.push({ type: 'text', text: CLAUDE_CODE_OAUTH_SYSTEM_PREFIX })
  }
  blocks.push({
    type: 'text',
    text: wikiMode ? getWikiScaffoldPrompt() : getBaseScaffoldPrompt(),
  })
  const customInstructions = await getClaudeMdInstructions()
  const customText = formatCustomInstructions(customInstructions)
  if (customText) {
    blocks.push({
      type: 'text',
      text: customText,
      cache_control: { type: 'ephemeral' },
    })
  }
  // Slash-command workflows live in a second cached system block. Moving them
  // out of per-turn user messages means each operation pays for them once
  // (cache write), then every subsequent round + every later operation in the
  // 5-minute TTL window hits cache instead of re-tokenising.
  if (wikiMode) {
    blocks.push({
      type: 'text',
      text: SLASH_COMMANDS_REFERENCE,
      cache_control: { type: 'ephemeral' },
    })
  }
  return blocks
}

const toAnthropicTools = () =>
  Object.values(toolRegistry).map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | unknown[]
}

export interface HandleClaudeOptions {
  wikiMode?: boolean
  toolCallbacks?: ToolCallCallbacks
  buddyMessageId?: string
}

interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string
  is_error?: boolean
  cache_control?: { type: 'ephemeral' }
}

/**
 * Cap individual tool_result content so a single big read (e.g. a long page
 * tree, a wide datascript query) doesn't bloat every subsequent round of the
 * tool-use loop. Claude is told it can re-call with a narrower query.
 */
const MAX_TOOL_RESULT_CHARS = 8000
const truncateForLLM = (s: string): string => {
  if (s.length <= MAX_TOOL_RESULT_CHARS) return s
  const head = s.slice(0, MAX_TOOL_RESULT_CHARS)
  return `${head}\n\n[truncated: full result was ${s.length.toLocaleString()} chars. Call with a narrower query if you need the rest.]`
}

/**
 * Anthropic allows up to 4 cache_control breakpoints per request. We already
 * use 2 in system (CLAUDE.md + slash-commands reference). Maintain a single
 * moving breakpoint on the latest user message's last tool_result so each
 * subsequent round caches the growing conversation prefix.
 *
 * Strips cache_control from any prior user messages before adding it to the
 * new one so we never exceed the budget.
 */
const setMovingMessageCache = (
  apiMessages: AnthropicMessage[],
  newResults: ToolResultBlock[],
): void => {
  for (const m of apiMessages) {
    if (m.role !== 'user' || !Array.isArray(m.content)) continue
    for (const block of m.content as Array<{ cache_control?: unknown }>) {
      if (block && typeof block === 'object' && 'cache_control' in block) {
        delete block.cache_control
      }
    }
  }
  const last = newResults[newResults.length - 1]
  if (last) last.cache_control = { type: 'ephemeral' }
}

const NO_PLAN_ERROR =
  'No approved plan in this session. You MUST call declare_plan first with the full ordered list of writes you intend, wait for the user to approve, and only then call write tools. If the user rejects the plan, ask them what they want to change and re-declare.'

export const handleClaude = async (
  messages: ChatMessage[],
  options: HandleClaudeOptions = {},
) => {
  const validMessages = dropWhile(messages, (m) => m.role !== 'user')
  if (validMessages.length === 0) return ''

  const wikiMode = !!options.wikiMode
  const useOAuth = isAnthropicOAuthToken(getAnthropicApiKeyFromSettings())
  const system = await buildSystem(useOAuth, wikiMode)

  const apiMessages: AnthropicMessage[] = validMessages.map((msg) => ({
    role: msg.role === 'buddy' ? 'assistant' : 'user',
    content: formatPromptWithContext({
      content: msg.content,
      context: msg.context,
    }),
  }))

  if (!wikiMode) {
    const response = await api()
      .post({
        model: getModelNameFromSettings(),
        max_tokens: 4096,
        system,
        messages: apiMessages,
      })
      .json<ClaudeResponse>()
    return extractText(response.content)
  }

  // Wiki mode: tool-use loop with plan-gated approval.
  const toolList = toAnthropicTools()
  let finalText = ''
  let currentPlan: PlanState | null = null
  let rounds = 0

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++
    const response = await api()
      .post({
        model: getModelNameFromSettings(),
        max_tokens: 4096,
        system,
        tools: toolList,
        messages: apiMessages,
      })
      .json<ClaudeResponse>()

    const assistantContent = response.content
    apiMessages.push({ role: 'assistant', content: assistantContent })

    const textPart = extractText(assistantContent)
    if (textPart) finalText = textPart

    if (response.stop_reason !== 'tool_use') break

    const toolUses = assistantContent.filter(
      (b): b is Extract<ClaudeContentBlock, { type: 'tool_use' }> =>
        b.type === 'tool_use',
    )
    if (toolUses.length === 0) break

    const toolResults: ToolResultBlock[] = []

    for (const use of toolUses) {
      const callId = use.id
      const cb = options.toolCallbacks
      const messageId = options.buddyMessageId ?? ''

      /* ---- declare_plan: gates everything else ---- */
      if (use.name === 'declare_plan') {
        const input = use.input as { steps?: string[] } | undefined
        const steps = Array.isArray(input?.steps) ? input.steps : []
        if (steps.length === 0) {
          toolResults.push(
            errorResult(
              callId,
              'declare_plan requires a non-empty steps array.',
            ),
          )
          continue
        }
        const plan: PlanState = {
          id: callId,
          status: 'awaiting-approval',
          steps: steps.map((title) => ({ title, status: 'pending' })),
        }
        currentPlan = plan
        cb?.onPlanDeclared(messageId, plan)

        const decision = cb
          ? await cb.awaitDecision(callId)
          : ('approve' as const)
        if (decision === 'reject') {
          currentPlan = { ...plan, status: 'rejected' }
          cb?.onPlanUpdate(messageId, { status: 'rejected' })
          toolResults.push(
            errorResult(
              callId,
              'User rejected the plan. Ask what they want to change and either re-declare a revised plan or stop. Do NOT call any write tools.',
            ),
          )
        } else {
          currentPlan = { ...plan, status: 'approved' }
          cb?.onPlanUpdate(messageId, { status: 'approved' })
          toolResults.push({
            type: 'tool_result',
            tool_use_id: callId,
            content: JSON.stringify({
              status: 'approved',
              planId: callId,
              steps: plan.steps.map((s, i) => ({ index: i, title: s.title })),
            }),
          })
        }
        continue
      }

      /* ---- mark_plan_step: update checklist ---- */
      if (use.name === 'mark_plan_step') {
        const input = use.input as
          | { index?: number; status?: PlanStepStatus; note?: string }
          | undefined
        if (
          !currentPlan ||
          currentPlan.status !== 'approved' ||
          typeof input?.index !== 'number' ||
          !input.status
        ) {
          toolResults.push(
            errorResult(
              callId,
              'mark_plan_step requires an approved plan and an integer index + status.',
            ),
          )
          continue
        }
        const step = currentPlan.steps[input.index]
        if (!step) {
          toolResults.push(
            errorResult(callId, `No plan step at index ${input.index}.`),
          )
          continue
        }
        const partial: Partial<PlanStep> = {
          status: input.status,
          ...(input.note ? { note: input.note } : {}),
        }
        Object.assign(step, partial)
        cb?.onPlanStepUpdate(messageId, input.index, partial)
        toolResults.push({
          type: 'tool_result',
          tool_use_id: callId,
          content: JSON.stringify({ ok: true, index: input.index }),
        })
        continue
      }

      const def = toolRegistry[use.name]
      if (!def) {
        toolResults.push(errorResult(callId, `Unknown tool: ${use.name}`))
        continue
      }

      /* ---- Gate writes on plan approval ---- */
      if (def.requiresConfirmation) {
        if (!currentPlan || currentPlan.status !== 'approved') {
          // Show blocked card so the user sees what was attempted.
          cb?.onToolCallStart(messageId, {
            id: callId,
            name: use.name,
            input: use.input,
            status: 'blocked',
          })
          toolResults.push(errorResult(callId, NO_PLAN_ERROR))
          continue
        }
      }

      /* ---- Execute (read or approved write) ---- */
      const call: ToolCall = {
        id: callId,
        name: use.name,
        input: use.input,
        status: 'running',
      }
      cb?.onToolCallStart(messageId, call)
      try {
        const result = await def.run(use.input)
        cb?.onToolCallUpdate(messageId, callId, {
          status: 'completed',
          result,
        })
        toolResults.push({
          type: 'tool_result',
          tool_use_id: callId,
          content: truncateForLLM(safeStringify(result)),
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        cb?.onToolCallUpdate(messageId, callId, {
          status: 'errored',
          error: message,
        })
        toolResults.push(errorResult(callId, message))
      }
    }

    setMovingMessageCache(apiMessages, toolResults)
    apiMessages.push({ role: 'user', content: toolResults })
  }

  const banner = buildCompletionBanner(currentPlan)
  if (banner) {
    finalText = finalText ? `${finalText}\n\n${banner}` : banner
  }
  return finalText || '[Tool-use loop hit max rounds.]'
}

const errorResult = (id: string, message: string): ToolResultBlock => ({
  type: 'tool_result',
  tool_use_id: id,
  content: message,
  is_error: true,
})

const extractText = (content: ClaudeContentBlock[]): string =>
  content
    .filter(
      (b): b is Extract<ClaudeContentBlock, { type: 'text' }> =>
        b.type === 'text',
    )
    .map((b) => b.text)
    .join('\n')
    .trim()

const safeStringify = (v: unknown): string => {
  try {
    const s = JSON.stringify(v)
    return s ?? String(v)
  } catch {
    return String(v)
  }
}

const STATUS_ICON: Record<PlanStepStatus, string> = {
  pending: '⚪',
  running: '⏳',
  done: '✅',
  failed: '❌',
  skipped: '⚠️',
}

/**
 * Synthesises a plugin-driven completion summary after the tool-use loop ends.
 * Driven entirely from the plan state (not the LLM's text), so the user gets
 * an authoritative status regardless of what the model said in chat.
 */
const buildCompletionBanner = (plan: PlanState | null): string => {
  if (!plan) return ''
  if (plan.status === 'rejected') {
    return '**Operation cancelled.** You rejected the plan; no graph writes were attempted.'
  }
  if (plan.status === 'awaiting-approval') {
    return '**Plan still awaiting approval.** The operation did not run.'
  }
  const total = plan.steps.length
  const done = plan.steps.filter((s) => s.status === 'done').length
  const failed = plan.steps.filter((s) => s.status === 'failed').length
  const skipped = plan.steps.filter((s) => s.status === 'skipped').length
  const open = plan.steps.filter(
    (s) => s.status === 'pending' || s.status === 'running',
  ).length

  const headline =
    failed === 0 && open === 0 && skipped === 0
      ? `**Operation complete: ${done}/${total} steps ✅**`
      : `**Operation finished: ${done}/${total} ✅, ${failed} ❌, ${skipped} ⚠️ skipped, ${open} not marked.**`

  const lines = plan.steps.map(
    (s, i) =>
      `- ${STATUS_ICON[s.status]} \`${i}\` ${s.title}${s.note ? ` — ${s.note}` : ''}`,
  )
  return `${headline}\n\n${lines.join('\n')}`
}
