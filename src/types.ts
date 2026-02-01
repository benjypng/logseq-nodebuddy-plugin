import { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { Dispatch, SetStateAction } from 'react'

export type GoogleModels =
  | 'gemini-2.5-flash-lite'
  | 'gemini-2.5-flash'
  | 'gemma3:27b'
  | 'gemma2:27b'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-haiku-4-5-20251001'
  | 'qwen3:8b'

export interface LogseqPageContextInterface {
  page: PageEntity | null
  setPage: (page: PageEntity | null) => void
}

export interface ChatFormValues {
  prompt: string
}

export interface NewPageFormValues {
  title: string
}

export type MessageRole = 'user' | 'buddy'

export type Source = 'tag' | 'current-page' | 'page-reference'

export interface ContextItem {
  source: string
  content: string
  createdAt: number
  updatedAt: number
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  context?: ContextItem[]
}

export interface GeminiResponse {
  candidates?: {
    content: {
      parts: { text: string }[]
    }
  }[]
  error?: {
    code: number
    message: string
    status: string
  }
}

export interface GemmaResponse {
  model: string
  created_at: string
  message: {
    role: 'assistant' | 'user' | 'system'
    content: string
    images?: string[] | null
  }
  done: boolean
}

export interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ClaudeResponse {
  content: {
    type: string
    text: string
  }[]
  id: string
  model: string
  role: string
  stop_reason: string | null
  stop_sequence: string | null
  type: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export interface FormatPromptProps {
  content: string
  context?: ContextItem[]
}

export interface MessageBubbleProps {
  msg: Partial<ChatMessage>
  colorScheme: string
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

export interface NewChatProps {
  setPage: Dispatch<SetStateAction<PageEntity | undefined>>
}

export interface ChatBoxProps {
  page: PageEntity
}
