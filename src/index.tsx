import '@logseq/libs'
import './styles.css'

import { createRoot } from 'react-dom/client'

import { NodeBuddyContainer } from './NodeBuddyContainer'
import { settings } from './settings'
import { applyWindowFrame, windowFrameStyle, windowStore } from './window-state'

const main = async () => {
  logseq.UI.showMsg('logseq-nodebuddy-plugin loaded')
  logseq.provideStyle(`
    ${windowFrameStyle()}

    div.preboot-loading {
      display: none !important;
    }`)

  logseq.showMainUI()
  applyWindowFrame()

  const el = document.getElementById('app')
  if (!el) return
  const root = createRoot(el)

  root.render(<NodeBuddyContainer />)

  logseq.App.registerCommandPalette(
    {
      key: 'logseq-nodebuddy-plugin',
      label: 'logseq-nodebuddy-plugin: Toggle NodeBuddy',
      keybinding: {
        mode: 'global',
        binding: 'mod+shift+n',
      },
    },
    async () => {
      windowStore.toggle()
    },
  )
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error)
