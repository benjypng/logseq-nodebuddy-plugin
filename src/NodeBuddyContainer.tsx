import { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { Stack, useMantineColorScheme } from '@mantine/core'
import { useEffect, useState } from 'react'

import { ChatBox } from './ChatBox'
import { NewChat } from './components'
import { LogseqPageContext } from './hooks'

export const NodeBuddyContainer = () => {
  const [page, setPage] = useState<PageEntity | null>(null)
  const { setColorScheme } = useMantineColorScheme()

  useEffect(() => {
    const cleanup = logseq.App.onThemeModeChanged(({ mode }) => {
      setColorScheme(mode)
    })
    return () => cleanup()
  }, [])

  useEffect(() => {
    // Handle shortcut to toggle UI
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

  useEffect(() => {
    const getCurrentPage = async () => {
      const currPage = await logseq.Editor.getCurrentPage()
      console.log(currPage)
    }
    getCurrentPage()
  }, [page])

  return (
    <Stack h="100vh" w="100%" bg="body" gap="xs">
      <LogseqPageContext.Provider value={{ page, setPage }}>
        {!page && <NewChat />}
        {page && <ChatBox />}
      </LogseqPageContext.Provider>
    </Stack>
  )
}
