import '@mantine/core/styles.css'
import '@logseq/libs'

import { MantineProvider } from '@mantine/core'
import { createRoot } from 'react-dom/client'

import { NodeBuddyContainer } from './NodeBuddyContainer'
import { settings } from './settings'

const main = async () => {
  setTimeout(() => {
    logseq.UI.showMsg('logseq-nodebuddy-plugin loaded')
  }, 1500)

  logseq.provideStyle(`
    body {
      display: flex !important;
      flex-direction: row !important;
      height: 100vh !important;
      overflow: hidden !important;
    }

    div#root {
      flex: 1 !important;
      overflow-y: auto !important;
      min-width: 0 !important;
    }

    div#logseq-nodebuddy-plugin_lsp_main {
      width: 400px !important;
      flex-shrink: 0 !important;
      height: 100% !important;
      position: relative !important;
      top: auto !important;
      left: auto !important; 
      overflow-y: auto !important;
      background: var(--ls-primary-background-color);
      border-left: 1px solid var(--lx-gray-09, #333);
      order: 1;
    }

    div.preboot-loading {
      display: none !important;
    }`)

  logseq.setMainUIInlineStyle({
    position: 'fixed',
    zIndex: 11,
    top: 0,
    left: 0,
    right: 'auto',
    width: '20rem',
  })

  const el = document.getElementById('app')
  if (!el) return
  const root = createRoot(el)

  root.render(
    <MantineProvider>
      <NodeBuddyContainer />
    </MantineProvider>,
  )

  logseq.App.registerCommandPalette(
    {
      key: 'logseq-searchreplace-plugin',
      label: 'Better Search: Open',
      keybinding: {
        mode: 'global',
        binding: 'mod+shift+n',
      },
    },
    async () => {
      logseq.toggleMainUI()
    },
  )
}

logseq.useSettingsSchema(settings).ready(main).catch(console.error)
