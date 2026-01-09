import { Dispatch, SetStateAction } from 'react'

export interface FormValues {
  prompt: string
}

export type MessageRole = 'user' | 'buddy'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  context?: string[]
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

export interface FormatPromptProps {
  content: string
  context?: string[]
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
