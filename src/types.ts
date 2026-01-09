import { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { Dispatch, SetStateAction } from 'react'

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
