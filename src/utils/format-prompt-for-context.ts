import { FormatPromptProps } from '../types'

export const formatPromptWithContext = ({
  content,
  context,
}: FormatPromptProps) => {
  if (!context || context.length === 0) return content

  const contextStr = context.map((block) => `- ${block}`).join('\n')

  const contentStr = content.trim()

  return `
Context:
${contextStr}

User Query:
${contentStr}`
}
