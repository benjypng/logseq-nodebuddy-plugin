export type WindowState = 'minimised' | 'expanded' | 'maximised'
export type OpenState = 'expanded' | 'maximised'

export const POPUP_MARGIN = 20
export const FAB_SIZE = 56

const MIN_WIDTH = 320
const MIN_HEIGHT = 360
const DEFAULT_WIDTH = 400
const DEFAULT_HEIGHT = 600

export interface PopupSize {
  width: number
  height: number
}

// `window.screen` reports the display size (no cross-frame access needed); it
// only bounds the *stored* value so it never grows absurd during a drag. The
// real visual clamp against the Logseq window happens in CSS via the
// max-width/max-height calc(100vw/vh ...) rules below.
const boundWidth = () => (window.screen?.availWidth || 1280) - POPUP_MARGIN * 2
const boundHeight = () => (window.screen?.availHeight || 800) - POPUP_MARGIN * 2
const clampWidth = (w: number) => Math.max(MIN_WIDTH, Math.min(w, boundWidth()))
const clampHeight = (h: number) =>
  Math.max(MIN_HEIGHT, Math.min(h, boundHeight()))

const readSize = (): PopupSize => ({
  width: clampWidth((logseq.settings?.popupWidth as number) || DEFAULT_WIDTH),
  height: clampHeight(
    (logseq.settings?.popupHeight as number) || DEFAULT_HEIGHT,
  ),
})

const readInitialState = (): WindowState => {
  const stored = logseq.settings?.windowState as WindowState | undefined
  if (stored === 'expanded' || stored === 'maximised') return stored
  return 'minimised'
}

const readInitialOpenState = (): OpenState => {
  const stored = logseq.settings?.lastOpenState as OpenState | undefined
  return stored === 'maximised' ? 'maximised' : 'expanded'
}

let state: WindowState = readInitialState()
let lastOpenState: OpenState = readInitialOpenState()
let size: PopupSize = readSize()

const listeners = new Set<() => void>()
const notify = () => {
  for (const fn of listeners) fn()
}

/**
 * Stylesheet injected via logseq.provideStyle so the plugin iframe fills its
 * wrapper and inherits the wrapper's rounded corners. This is the sanctioned
 * SDK path (no parent.document access); the wrapper's own size and position are
 * driven entirely through setMainUIInlineStyle in applyWindowFrame.
 */
export const windowFrameStyle = () => `
  #${logseq.baseInfo.id}_lsp_main iframe {
    width: 100% !important;
    height: 100% !important;
    border: 0 !important;
    border-radius: inherit;
  }`

type FrameStyle = Record<string, string | number>

const FRAME_BASE: FrameStyle = {
  position: 'fixed',
  top: 'auto',
  left: 'auto',
  zIndex: 999999,
  overflow: 'hidden',
  background: 'transparent',
}

const buildFrameStyle = (): FrameStyle => {
  if (state === 'minimised') {
    return {
      ...FRAME_BASE,
      right: `${POPUP_MARGIN}px`,
      bottom: `${POPUP_MARGIN}px`,
      width: `${FAB_SIZE}px`,
      height: `${FAB_SIZE}px`,
      maxWidth: 'none',
      maxHeight: 'none',
      borderRadius: '50%',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.24)',
    }
  }
  if (state === 'maximised') {
    return {
      ...FRAME_BASE,
      right: `${POPUP_MARGIN * 2}px`,
      bottom: `${POPUP_MARGIN * 2}px`,
      width: `calc(100vw - ${POPUP_MARGIN * 4}px)`,
      height: `calc(100vh - ${POPUP_MARGIN * 4}px)`,
      maxWidth: 'none',
      maxHeight: 'none',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
    }
  }
  return {
    ...FRAME_BASE,
    right: `${POPUP_MARGIN}px`,
    bottom: `${POPUP_MARGIN}px`,
    width: `${size.width}px`,
    height: `${size.height}px`,
    maxWidth: `calc(100vw - ${POPUP_MARGIN * 2}px)`,
    maxHeight: `calc(100vh - ${POPUP_MARGIN * 2}px)`,
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.28)',
  }
}

/**
 * Pushes the current frame size and position onto the plugin's main UI wrapper
 * through the SDK. setMainUIInlineStyle writes the wrapper's inline style for
 * us, so the plugin never has to reach into the parent document.
 */
export const applyWindowFrame = () => {
  logseq.setMainUIInlineStyle(buildFrameStyle())
}

const persist = () => {
  logseq.updateSettings({
    windowState: state,
    lastOpenState,
    popupWidth: size.width,
    popupHeight: size.height,
  })
}

export const windowStore = {
  getState: () => state,
  getLastOpenState: () => lastOpenState,
  getSize: () => size,
  subscribe: (fn: () => void) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  set: (next: WindowState) => {
    state = next
    if (next === 'expanded' || next === 'maximised') lastOpenState = next
    applyWindowFrame()
    persist()
    notify()
  },
  /** Toggle between minimised and the last open state. */
  toggle: () => {
    windowStore.set(state === 'minimised' ? lastOpenState : 'minimised')
  },
  /** Used during drag-resize; clamps and applies without persisting each frame. */
  setSize: (next: PopupSize) => {
    size = { width: clampWidth(next.width), height: clampHeight(next.height) }
    applyWindowFrame()
    notify()
  },
  commitSize: () => {
    persist()
  },
}
