import {
  formatCustomInstructions,
  getClaudeMdInstructions,
  getWikiScaffoldPrompt,
} from '../../constants'
import { SLASH_COMMANDS_REFERENCE } from '../../wiki'

export interface SystemBlock {
  type: 'text'
  text: string
  cache_control?: { type: 'ephemeral' }
}

const CLAUDE_CODE_OAUTH_SYSTEM_PREFIX =
  "You are Claude Code, Anthropic's official CLI for Claude."

/**
 * Anthropic Wiki-Mode system: cached multi-block layout so CLAUDE.md and the
 * slash-command reference are tokenised once per 5-minute TTL window.
 */
export const buildAnthropicSystem = async (
  useOAuth: boolean,
): Promise<SystemBlock[]> => {
  const blocks: SystemBlock[] = []
  if (useOAuth) {
    blocks.push({ type: 'text', text: CLAUDE_CODE_OAUTH_SYSTEM_PREFIX })
  }
  blocks.push({ type: 'text', text: getWikiScaffoldPrompt() })
  const customText = formatCustomInstructions(await getClaudeMdInstructions())
  if (customText) {
    blocks.push({
      type: 'text',
      text: customText,
      cache_control: { type: 'ephemeral' },
    })
  }
  blocks.push({
    type: 'text',
    text: SLASH_COMMANDS_REFERENCE,
    cache_control: { type: 'ephemeral' },
  })
  return blocks
}

/**
 * Gemini / OpenAI Wiki-Mode system: a single concatenated string (these
 * providers have no prompt-caching breakpoints).
 */
export const buildWikiSystemText = async (): Promise<string> => {
  const customText = formatCustomInstructions(await getClaudeMdInstructions())
  return [getWikiScaffoldPrompt(), customText, SLASH_COMMANDS_REFERENCE]
    .filter(Boolean)
    .join('\n\n')
}
