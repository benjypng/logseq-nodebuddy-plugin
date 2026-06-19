import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

import { ChatBox, createGreetingMessages } from './ChatBox'
import { NodeBuddyFab, WindowControls } from './components'
import { type ColorScheme, ColorSchemeContext } from './hooks'
import type { ChatMessage } from './types'
import { clearPendingDecisions } from './wiki'
import { windowStore } from './window-state'

export const NodeBuddyContainer = () => {
  const windowState = useSyncExternalStore(
    windowStore.subscribe,
    windowStore.getState,
  )

  const [colorScheme, setColorScheme] = useState<ColorScheme>('light')
  // The conversation lives here, not in ChatBox, so it survives minimise (which
  // unmounts ChatBox) and only dies when this iframe is torn down (Logseq
  // closes). "New conversation" is the explicit reset.
  const [messages, setMessages] = useState<ChatMessage[]>(
    createGreetingMessages,
  )
  // Bumping this remounts ChatBox for a clean slate (form input, scroll,
  // CLAUDE.md re-check) on reset.
  const [sessionId, setSessionId] = useState(0)
  const newConversation = () => {
    clearPendingDecisions()
    setMessages(createGreetingMessages())
    setSessionId((n) => n + 1)
  }

  // Clear any stale pending plan-approval on first load only — NOT on every
  // restore-from-minimise (that would wipe a decision the user left pending).
  useEffect(() => {
    clearPendingDecisions()
  }, [])

  const [isResizing, setIsResizing] = useState(false)

  useEffect(() => {
    const cleanup = logseq.App.onThemeModeChanged(({ mode }) => {
      setColorScheme(mode as ColorScheme)
    })
    return () => cleanup()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        windowStore.set('minimised')
        return
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'n'
      ) {
        e.preventDefault()
        windowStore.toggle()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // The popup is anchored bottom-right, so its only free edges are the top and
  // left. Dragging the left edge changes width, the top edge changes height,
  // and the top-left corner changes both. Pulling away from the anchor (up /
  // left) grows the popup.
  const startResize = useCallback(
    (axis: 'x' | 'y' | 'xy') => (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      const { width: startWidth, height: startHeight } = windowStore.getSize()
      const startScreenX = e.screenX
      const startScreenY = e.screenY
      setIsResizing(true)

      // Capturing the pointer keeps move/up events flowing to this handle even
      // once the cursor leaves the iframe and travels over the Logseq app, so
      // we never have to listen on the parent document.
      const handle = e.currentTarget
      handle.setPointerCapture(e.pointerId)

      const onMove = (ev: PointerEvent) => {
        windowStore.setSize({
          width:
            axis === 'y'
              ? startWidth
              : startWidth + (startScreenX - ev.screenX),
          height:
            axis === 'x'
              ? startHeight
              : startHeight + (startScreenY - ev.screenY),
        })
      }

      const onUp = () => {
        handle.removeEventListener('pointermove', onMove)
        handle.removeEventListener('pointerup', onUp)
        handle.removeEventListener('pointercancel', onUp)
        setIsResizing(false)
        windowStore.commitSize()
      }

      handle.addEventListener('pointermove', onMove)
      handle.addEventListener('pointerup', onUp)
      handle.addEventListener('pointercancel', onUp)
    },
    [],
  )

  if (windowState === 'minimised') {
    return (
      <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
        <div className="nb-fab-shell" data-theme={colorScheme}>
          <NodeBuddyFab />
        </div>
      </ColorSchemeContext.Provider>
    )
  }

  return (
    <ColorSchemeContext.Provider value={{ colorScheme, setColorScheme }}>
      <div
        className={`nb-container nb-container--${windowState}`}
        data-theme={colorScheme}
      >
        {windowState === 'expanded' && (
          <>
            <div
              className={`nb-resize nb-resize--left ${isResizing ? 'nb-resize--active' : ''}`}
              onPointerDown={startResize('x')}
            />
            <div
              className={`nb-resize nb-resize--corner ${isResizing ? 'nb-resize--active' : ''}`}
              onPointerDown={startResize('xy')}
              title="Drag to resize"
            />
          </>
        )}
        <WindowControls
          windowState={windowState}
          showNewChat={true}
          onNewChat={newConversation}
        />
        <ChatBox
          key={sessionId}
          messages={messages}
          setMessages={setMessages}
        />
      </div>
    </ColorSchemeContext.Provider>
  )
}
