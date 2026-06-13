import { Dispatch, SetStateAction } from 'react'

export type NodeBuddyModels =
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-flash'
  | 'gemma4:latest'
  | 'gemma3:27b'
  | 'gemma2:27b'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-haiku-4-5-20251001'
  | 'qwen3:8b'

export interface ChatFormValues {
  prompt: string
}

export type MessageRole = 'user' | 'buddy'

export type Source = 'tag' | 'current-page' | 'page-reference' | 'current-week'

export interface ContextItem {
  source: string
  content: string
  createdAt: number
  updatedAt: number
}

export type ToolCallStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'errored'
  | 'blocked'

export interface ToolCall {
  id: string
  name: string
  input: unknown
  status: ToolCallStatus
  result?: unknown
  error?: string
}

export type PlanStepStatus =
  | 'pending'
  | 'running'
  | 'done'
  | 'failed'
  | 'skipped'

export interface PlanStep {
  title: string
  status: PlanStepStatus
  note?: string
}

export type PlanStatus = 'awaiting-approval' | 'approved' | 'rejected'

export interface PlanState {
  id: string
  status: PlanStatus
  steps: PlanStep[]
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  context?: ContextItem[]
  toolCalls?: ToolCall[]
  plan?: PlanState
}

export type ToolDecision = 'approve' | 'reject'

export interface ToolCallCallbacks {
  onToolCallStart: (messageId: string, call: ToolCall) => void
  onToolCallUpdate: (
    messageId: string,
    callId: string,
    partial: Partial<ToolCall>,
  ) => void
  onPlanDeclared: (messageId: string, plan: PlanState) => void
  onPlanUpdate: (messageId: string, partial: Partial<PlanState>) => void
  onPlanStepUpdate: (
    messageId: string,
    index: number,
    partial: Partial<PlanStep>,
  ) => void
  awaitDecision: (id: string) => Promise<ToolDecision>
}

export type ClaudeContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: string; [k: string]: unknown }

export interface ClaudeResponse {
  content: ClaudeContentBlock[]
  id: string
  model: string
  role: string
  stop_reason: string | null
  stop_sequence: string | null
  type: string
  usage: {
    input_tokens: number
    output_tokens: number
    cache_read_input_tokens?: number
    cache_creation_input_tokens?: number
  }
}

export interface FormatPromptProps {
  content: string
  context?: ContextItem[]
}

export interface MessageBubbleProps {
  msg: Partial<ChatMessage>
  onPlanDecide?: (planId: string, decision: ToolDecision) => void
}

export interface AvatarProps {
  role: MessageRole
}

export interface UserInputProps {
  messages: ChatMessage[]
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
}

export interface VisibilityProps {
  visible: boolean
}
