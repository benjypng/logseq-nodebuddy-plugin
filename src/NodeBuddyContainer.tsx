import { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ChatBox } from './ChatBox'
import { NewChat } from './components'
import {
  type ColorScheme,
  ColorSchemeContext,
  LogseqPageContext,
} from './hooks'

const MIN_WIDTH = 280
const MAX_WIDTH = 700

const setSidebarWidth = (width: number) => {
  const clamped = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, width))
  const wrapper = parent.document.getElementById(
    'logseq-nodebuddy-plugin_lsp_main',
  )
  if (wrapper) wrapper.style.width = `${clamped}px`
  return clamped
}

export const NodeBuddyContainer = () => {
  const [page, setPage] = useState<PageEntity | null>(null)
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light')
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startScreenX: 0, startWidth: 0 })

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

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const wrapper = parent.document.getElementById(
      'logseq-nodebuddy-plugin_lsp_main',
    )
    const currentWidth = wrapper?.offsetWidth || 400
    dragRef.current = { startScreenX: e.screenX, startWidth: currentWidth }
    setIsDragging(true)

    // Disable pointer events on the iframe so the parent document
    // receives all mouse events during drag
    const iframe = wrapper?.querySelector('iframe') as HTMLIFrameElement | null
    if (iframe) iframe.style.pointerEvents = 'none'

    const onMouseMove = (e: MouseEvent) => {
      const { startScreenX, startWidth } = dragRef.current
      const delta = startScreenX - e.screenX
      setSidebarWidth(startWidth + delta)
    }

    const cleanup = () => {
      parent.document.removeEventListener('mousemove', onMouseMove)
      parent.document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
      if (iframe) iframe.style.pointerEvents = ''
    }

    const onMouseUp = (e: MouseEvent) => {
      cleanup()
      setIsDragging(false)

      const { startScreenX, startWidth } = dragRef.current
      const delta = startScreenX - e.screenX
      const finalWidth = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, startWidth + delta),
      )
      logseq.updateSettings({ sidebarWidth: finalWidth })
    }

    parent.document.addEventListener('mousemove', onMouseMove)
    parent.document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [])

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      <div className="nb-container" data-theme={colorScheme}>
        <div
          className={`nb-resize-handle ${isDragging ? 'nb-resize-handle--active' : ''}`}
          onMouseDown={handleResizeStart}
        />
        <LogseqPageContext.Provider value={{ page, setPage }}>
          {!page && <NewChat />}
          {page && <ChatBox />}
        </LogseqPageContext.Provider>
      </div>
    </ColorSchemeContext.Provider>
  )
}
