import { FormatPromptProps } from '../types'

export const formatPromptWithContext = ({
  content,
  context,
}: FormatPromptProps) => {
  if (!context || context.length === 0) return content

  const contextString = context
    .map((item) => {
      const dateStr = item.updatedAt
        ? ` (Date: ${new Date(item.updatedAt).toUTCString()})`
        : ''

      return `[${item.source}]${dateStr}: ${item.content}`
    })
    .join('\n')

  return `
Context Data:
${contextString}

User Query:
${content}`
}
