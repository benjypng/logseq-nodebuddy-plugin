import { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { useEffect, useState } from 'react'

import { ChatBox } from './ChatBox'
import { NewChat } from './components'
import {
  ColorSchemeContext,
  type ColorScheme,
  LogseqPageContext,
} from './hooks'

export const NodeBuddyContainer = () => {
  const [page, setPage] = useState<PageEntity | null>(null)
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light')

  useEffect(() => {
    const cleanup = logseq.App.onThemeModeChanged(({ mode }) => {
      setColorScheme(mode as ColorScheme)
    })
    return () => cleanup()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        logseq.toggleMainUI()
        return
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'n'
      ) {
        e.preventDefault()
        logseq.toggleMainUI()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      <div className="nb-container" data-theme={colorScheme}>
        <LogseqPageContext.Provider value={{ page, setPage }}>
          {!page && <NewChat />}
          {page && <ChatBox />}
        </LogseqPageContext.Provider>
      </div>
    </ColorSchemeContext.Provider>
  )
}
