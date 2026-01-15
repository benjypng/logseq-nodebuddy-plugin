import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user'

export const settings: SettingSchemaDesc[] = [
  {
    key: 'apiKey',
    type: 'string',
    default: '',
    title: 'Gemini API Key',
    description: 'Enter your Google Gemini API Key.',
  },
  {
    key: 'model',
    type: 'enum',
    default: 'gemini-2.5-flash',
    title: 'Model Name',
    description: 'The model ID to use (e.g., gemini-2.5-flash-lite).',
    enumChoices: [
      'gemini-2.5-flash-lite',
      'gemini-2.5-flash',
      'gemma3:27b',
      'gemma2:27b',
    ],
    enumPicker: 'select',
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
    key: 'userPrompt',
    type: 'string',
    default: '',
    title: 'User Prompt',
    description: 'Add your own scaffold prompt for NodeBuddy.',
  },
]
