import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

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
  const dragRef = useRef({
    startScreenX: 0,
    startScreenY: 0,
    startWidth: 0,
    startHeight: 0,
  })

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
    (axis: 'x' | 'y' | 'xy') => (e: React.MouseEvent) => {
      e.preventDefault()
      const { width, height } = windowStore.getSize()
      dragRef.current = {
        startScreenX: e.screenX,
        startScreenY: e.screenY,
        startWidth: width,
        startHeight: height,
      }
      setIsResizing(true)

      const wrapper = parent.document.getElementById(
        'logseq-nodebuddy-plugin_lsp_main',
      )
      // Disable pointer events on the iframe so the parent document receives
      // all mouse events during the drag.
      const iframe = wrapper?.querySelector(
        'iframe',
      ) as HTMLIFrameElement | null
      if (iframe) iframe.style.pointerEvents = 'none'

      const onMouseMove = (ev: MouseEvent) => {
        const { startScreenX, startScreenY, startWidth, startHeight } =
          dragRef.current
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

      const cleanup = () => {
        parent.document.removeEventListener('mousemove', onMouseMove)
        parent.document.removeEventListener('mouseup', onMouseUp)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        if (iframe) iframe.style.pointerEvents = ''
      }

      const onMouseUp = () => {
        cleanup()
        setIsResizing(false)
        windowStore.commitSize()
      }

      parent.document.addEventListener('mousemove', onMouseMove)
      parent.document.addEventListener('mouseup', onMouseUp)
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
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
              onMouseDown={startResize('x')}
            />
            <div
              className={`nb-resize nb-resize--corner ${isResizing ? 'nb-resize--active' : ''}`}
              onMouseDown={startResize('xy')}
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
