import { tools as toolRegistry } from '../mcp'
import type {
  PlanState,
  PlanStep,
  PlanStepStatus,
  ToolCall,
  ToolCallCallbacks,
} from '../types'
import type {
  NormalizedToolCall,
  ProviderAdapter,
  ToolResultPayload,
} from './adapters/types'

const MAX_TOOL_ROUNDS = 20

/**
 * Cap individual tool_result content so a single big read (e.g. a long page
 * tree, a wide datascript query) doesn't bloat every subsequent round.
 */
const MAX_TOOL_RESULT_CHARS = 8000
const truncateForLLM = (s: string): string => {
  if (s.length <= MAX_TOOL_RESULT_CHARS) return s
  const head = s.slice(0, MAX_TOOL_RESULT_CHARS)
  return `${head}\n\n[truncated: full result was ${s.length.toLocaleString()} chars. Call with a narrower query if you need the rest.]`
}

const safeStringify = (v: unknown): string => {
  try {
    const s = JSON.stringify(v)
    return s ?? String(v)
  } catch {
    return String(v)
  }
}

const NO_PLAN_ERROR =
  'No approved plan in this session. You MUST call declare_plan first with the full ordered list of writes you intend, wait for the user to approve, and only then call write tools. If the user rejects the plan, ask them what they want to change and re-declare.'

const errPayload = (
  call: NormalizedToolCall,
  content: string,
): ToolResultPayload => ({
  id: call.id,
  name: call.name,
  content,
  isError: true,
})

export interface RunToolLoopOptions {
  toolCallbacks?: ToolCallCallbacks
  buddyMessageId?: string
}

export const runToolLoop = async (
  adapter: ProviderAdapter,
  options: RunToolLoopOptions = {},
): Promise<string> => {
  const cb = options.toolCallbacks
  const messageId = options.buddyMessageId ?? ''
  let finalText = ''
  let currentPlan: PlanState | null = null
  let rounds = 0

  while (rounds < MAX_TOOL_ROUNDS) {
    rounds++
    const turn = await adapter.send()
    if (turn.text) finalText = turn.text
    if (turn.toolCalls.length === 0) break

    const results: ToolResultPayload[] = []

    for (const call of turn.toolCalls) {
      /* ---- declare_plan: gates everything else ---- */
      if (call.name === 'declare_plan') {
        const input = call.input as { steps?: string[] } | undefined
        const steps = Array.isArray(input?.steps) ? input.steps : []
        if (steps.length === 0) {
          results.push(
            errPayload(call, 'declare_plan requires a non-empty steps array.'),
          )
          continue
        }
        const plan: PlanState = {
          id: call.id,
          status: 'awaiting-approval',
          steps: steps.map((title) => ({ title, status: 'pending' })),
        }
        currentPlan = plan
        cb?.onPlanDeclared(messageId, plan)

        const decision = cb
          ? await cb.awaitDecision(call.id)
          : ('approve' as const)
        if (decision === 'reject') {
          currentPlan = { ...plan, status: 'rejected' }
          cb?.onPlanUpdate(messageId, { status: 'rejected' })
          results.push(
            errPayload(
              call,
              'User rejected the plan. Ask what they want to change and either re-declare a revised plan or stop. Do NOT call any write tools.',
            ),
          )
        } else {
          currentPlan = { ...plan, status: 'approved' }
          cb?.onPlanUpdate(messageId, { status: 'approved' })
          results.push({
            id: call.id,
            name: call.name,
            isError: false,
            content: JSON.stringify({
              status: 'approved',
              planId: call.id,
              steps: plan.steps.map((s, i) => ({ index: i, title: s.title })),
            }),
          })
        }
        continue
      }

      /* ---- mark_plan_step: update checklist ---- */
      if (call.name === 'mark_plan_step') {
        const input = call.input as
          | { index?: number; status?: PlanStepStatus; note?: string }
          | undefined
        if (
          !currentPlan ||
          currentPlan.status !== 'approved' ||
          typeof input?.index !== 'number' ||
          !input.status
        ) {
          results.push(
            errPayload(
              call,
              'mark_plan_step requires an approved plan and an integer index + status.',
            ),
          )
          continue
        }
        const step = currentPlan.steps[input.index]
        if (!step) {
          results.push(
            errPayload(call, `No plan step at index ${input.index}.`),
          )
          continue
        }
        const partial: Partial<PlanStep> = {
          status: input.status,
          ...(input.note ? { note: input.note } : {}),
        }
        Object.assign(step, partial)
        cb?.onPlanStepUpdate(messageId, input.index, partial)
        results.push({
          id: call.id,
          name: call.name,
          isError: false,
          content: JSON.stringify({ ok: true, index: input.index }),
        })
        continue
      }

      const def = toolRegistry[call.name]
      if (!def) {
        results.push(errPayload(call, `Unknown tool: ${call.name}`))
        continue
      }

      /* ---- Gate writes on plan approval ---- */
      if (def.requiresConfirmation) {
        if (!currentPlan || currentPlan.status !== 'approved') {
          cb?.onToolCallStart(messageId, {
            id: call.id,
            name: call.name,
            input: call.input,
            status: 'blocked',
          })
          results.push(errPayload(call, NO_PLAN_ERROR))
          continue
        }
      }

      /* ---- Execute (read or approved write) ---- */
      const toolCall: ToolCall = {
        id: call.id,
        name: call.name,
        input: call.input,
        status: 'running',
      }
      cb?.onToolCallStart(messageId, toolCall)
      try {
        const result = await def.run(call.input)
        cb?.onToolCallUpdate(messageId, call.id, {
          status: 'completed',
          result,
        })
        results.push({
          id: call.id,
          name: call.name,
          isError: false,
          content: truncateForLLM(safeStringify(result)),
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        cb?.onToolCallUpdate(messageId, call.id, {
          status: 'errored',
          error: message,
        })
        results.push(errPayload(call, message))
      }
    }

    adapter.recordToolResults(results)
  }

  const banner = buildCompletionBanner(currentPlan)
  if (banner) {
    finalText = finalText ? `${finalText}\n\n${banner}` : banner
  }
  return finalText || '[Tool-use loop hit max rounds.]'
}

const STATUS_ICON: Record<PlanStepStatus, string> = {
  pending: '⚪',
  running: '⏳',
  done: '✅',
  failed: '❌',
  skipped: '⚠️',
}

/**
 * Plugin-driven completion summary, derived from plan state (not the LLM's
 * text), so the user gets an authoritative status regardless of what the model
 * said in chat.
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
