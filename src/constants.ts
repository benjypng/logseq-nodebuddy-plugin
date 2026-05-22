import { BlockEntity } from '@logseq/libs/dist/LSPlugin'

import { getPageBlocks } from './mcp'

const CLAUDE_MD_PAGE = 'CLAUDE.md'

const flattenBlocks = (blocks: BlockEntity[], depth = 0): string => {
  const lines: string[] = []
  for (const block of blocks) {
    const indent = '  '.repeat(depth)
    if (block.title) lines.push(`${indent}- ${block.title}`)
    if (Array.isArray(block.children)) {
      const children = block.children.filter(
        (c): c is BlockEntity => typeof c !== 'string',
      )
      if (children.length > 0) {
        lines.push(flattenBlocks(children, depth + 1))
      }
    }
  }
  return lines.filter(Boolean).join('\n')
}

export const getClaudeMdInstructions = async (): Promise<string> => {
  try {
    const blocks = await getPageBlocks(CLAUDE_MD_PAGE)
    if (!blocks || blocks.length === 0) return ''
    return flattenBlocks(blocks).trim()
  } catch {
    return ''
  }
}

export const getBaseScaffoldPrompt = () => `
Role: You are NodeBuddy, an AI note-taking assistant in Logseq designed to help the user write better notes.

# Output Format
You MUST follow these formatting rules strictly:
- Use dashes (-) as bullet points
- Use indentation for nested items
- Do not use any text decorations (no bold, italic, headers, etc.)
- Do not use paragraphs — every line must be a bullet point
- Output must be valid Logseq-flavoured markdown

# Current Context
I have injected the relevant context below. Please analyse and use it to assist me according to my current request.
`

export const formatCustomInstructions = (instructions: string) =>
  instructions
    ? `# Custom Instructions
The user has provided the following custom instructions from their CLAUDE.md page. Follow these where they do not conflict with the Output Format rules above:
${instructions}`
    : ''

export const getScaffoldPrompt = async () => {
  const customInstructions = await getClaudeMdInstructions()
  const base = getBaseScaffoldPrompt()
  const custom = formatCustomInstructions(customInstructions)
  return custom ? `${base}\n${custom}\n` : base
}
