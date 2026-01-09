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
    type: 'string',
    default: 'gemini-2.5-flash',
    title: 'Model Name',
    description: 'The model ID to use (e.g., gemini-1.5-pro).',
  },
  {
    key: 'nodeBuddyTag',
    type: 'string',
    default: 'NodeBuddy',
    title: 'NodeBuddy Page Tag',
    description:
      'NodeBuddy chat histories are stored on pages in the graph. Indicate the tag used for these pages.',
  },
]
