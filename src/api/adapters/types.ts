export interface NormalizedToolCall {
  id: string
  name: string
  input: unknown
}

export interface NormalizedTurn {
  /** Assistant prose for this round (may be empty when only tools were called). */
  text: string
  /** Tool calls the model wants executed this round (empty → loop ends). */
  toolCalls: NormalizedToolCall[]
}

export interface ToolResultPayload {
  /** Matches the originating NormalizedToolCall.id. */
  id: string
  /** Tool name — some providers (Gemini) key results by name, not id. */
  name: string
  /** Stringified tool output (already truncated by the loop). */
  content: string
  isError: boolean
}

/**
 * A provider-specific shim over one model's tool-calling wire format. The
 * generic runToolLoop() drives it and never sees raw provider shapes. The
 * adapter owns its own native conversation array internally: send() both
 * performs the round-trip AND appends the assistant turn natively, so the loop
 * only needs send() + recordToolResults().
 */
export interface ProviderAdapter {
  send: () => Promise<NormalizedTurn>
  recordToolResults: (results: ToolResultPayload[]) => void
}
