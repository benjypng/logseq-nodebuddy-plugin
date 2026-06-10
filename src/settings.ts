import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user'

export const settings: SettingSchemaDesc[] = [
  {
    key: 'model',
    type: 'enum',
    default: 'gemini-2.5-flash',
    title: 'Model Name',
    description:
      'The model ID to use (e.g., gemini-2.5-flash-lite). For non-local foundation models, ensure that the API key is entered below.',
    enumChoices: [
      'gemini-2.5-flash-pro',
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemini-3-flash-preview',
      'gemini-3-pro-preview',
      'gemma4:latest',
      'gemma3:27b',
      'gemma2:27b',
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-5-20250929',
      'claude-opus-4-7',
      'claude-opus-4-6',
      'claude-sonnet-4-6',
      'deepseek-v4-pro',
      'deepseek-v4-flash',
      'qwen3:8b',
    ],
    enumPicker: 'select',
  },
  {
    key: 'geminiApiKey',
    type: 'string',
    default: '',
    title: 'Gemini API Key',
    description: 'Enter your Google Gemini API Key.',
  },
  {
    key: 'anthropicApiKey',
    type: 'string',
    default: '',
    title: 'Anthropic API Key or OAuth Token',
    description: 'Enter your Anthropic API key.',
  },
  {
    key: 'deepseekApiKey',
    type: 'string',
    default: '',
    title: 'DeepSeek API Key',
    description: 'Enter your DeepSeek API Key.',
  },
  {
    key: 'localEndpoint',
    type: 'string',
    default: 'http://localhost:1234/v1/chat/completions',
    title: 'Local Model Endpoint',
    description: 'Endpoint of local models such as Qwen or Gemma.',
  },
  {
    key: 'nodeBuddyTag',
    type: 'string',
    default: 'NodeBuddy',
    title: 'NodeBuddy Page Tag',
    description:
      'NodeBuddy chat histories are stored on pages in the graph. Indicate the tag used for these pages.',
  },
  {
    key: 'popupWidth',
    type: 'number',
    default: 400,
    title: 'Popup Width',
    description:
      'Width of the NodeBuddy popup in pixels. You can also drag the top-left corner to resize.',
  },
  {
    key: 'popupHeight',
    type: 'number',
    default: 600,
    title: 'Popup Height',
    description:
      'Height of the NodeBuddy popup in pixels. You can also drag the top-left corner to resize.',
  },
  {
    key: 'claudeMdPageHeader',
    type: 'heading',
    default: '',
    title: 'Wiki Mode Settings',
    description: 'The following settings only apply to Wiki Mode.',
  },
  {
    key: 'claudeMdPage',
    type: 'string',
    default: 'CLAUDE.md',
    title: 'CLAUDE.md Page',
    description:
      'Page name where the CLAUDE.md can be found. The page should only have a single block that is a markdown code-block containing the CLAUDE.md text.',
  },
]
