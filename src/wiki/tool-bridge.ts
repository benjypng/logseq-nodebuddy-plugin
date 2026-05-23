import type { ToolDecision } from '../types'

/**
 * Bridge between the LLM tool-use loop (which awaits user decisions) and the
 * UI cards (which resolve them on click). Keyed by an arbitrary id — currently
 * the plan id; previously also tool-call ids when per-write approval existed.
 */
const pending = new Map<string, (decision: ToolDecision) => void>()

export const awaitDecision = (id: string): Promise<ToolDecision> =>
  new Promise<ToolDecision>((resolve) => {
    pending.set(id, (decision) => {
      pending.delete(id)
      resolve(decision)
    })
  })

export const resolveDecision = (
  id: string,
  decision: ToolDecision,
): boolean => {
  const resolver = pending.get(id)
  if (!resolver) return false
  resolver(decision)
  return true
}

export const clearPendingDecisions = () => {
  for (const resolver of pending.values()) resolver('reject')
  pending.clear()
}
