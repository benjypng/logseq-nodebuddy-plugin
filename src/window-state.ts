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

// The plugin runs inside an iframe, so the screen size lives on `parent`;
// `window.innerWidth` here would only be the popup's own width.
const screenWidth = () => parent.innerWidth || 1280
const screenHeight = () => parent.innerHeight || 800
const clampWidth = (w: number) =>
  Math.max(MIN_WIDTH, Math.min(w, screenWidth() - POPUP_MARGIN * 2))
const clampHeight = (h: number) =>
  Math.max(MIN_HEIGHT, Math.min(h, screenHeight() - POPUP_MARGIN * 2))

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

const getWrapper = () =>
  parent.document.getElementById('logseq-nodebuddy-plugin_lsp_main')

const WRAPPER = '#logseq-nodebuddy-plugin_lsp_main'

/**
 * Stylesheet (injected into the *parent* document via logseq.provideStyle)
 * that floats the plugin iframe wrapper bottom-right. Rules use !important and
 * class toggles to win against the inline styles Logseq applies to the wrapper;
 * dynamic popup size flows through the --nb-w / --nb-h custom properties, which
 * Logseq never touches.
 */
export const WINDOW_FRAME_STYLE = `
  ${WRAPPER} {
    position: fixed !important;
    top: auto !important;
    left: auto !important;
    right: ${POPUP_MARGIN}px !important;
    bottom: ${POPUP_MARGIN}px !important;
    z-index: 999999 !important;
    overflow: hidden !important;
    background: transparent !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28) !important;
  }
  ${WRAPPER}.nb-frame-min {
    width: ${FAB_SIZE}px !important;
    height: ${FAB_SIZE}px !important;
    border-radius: 50% !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.24) !important;
  }
  ${WRAPPER}.nb-frame-expanded {
    width: var(--nb-w, ${DEFAULT_WIDTH}px) !important;
    height: var(--nb-h, ${DEFAULT_HEIGHT}px) !important;
    border-radius: 12px !important;
  }
  ${WRAPPER}.nb-frame-max {
    right: ${POPUP_MARGIN * 2}px !important;
    bottom: ${POPUP_MARGIN * 2}px !important;
    width: calc(100vw - ${POPUP_MARGIN * 4}px) !important;
    height: calc(100vh - ${POPUP_MARGIN * 4}px) !important;
    border-radius: 12px !important;
  }
  ${WRAPPER} iframe {
    width: 100% !important;
    height: 100% !important;
    border: 0 !important;
  }`

const FRAME_CLASS: Record<WindowState, string> = {
  minimised: 'nb-frame-min',
  expanded: 'nb-frame-expanded',
  maximised: 'nb-frame-max',
}

/**
 * Switches the wrapper's frame class and feeds the current popup size through
 * CSS custom properties. The wrapper lives in the parent document, so this is
 * the one place that reaches across.
 */
export const applyWindowFrame = () => {
  const wrapper = getWrapper()
  if (!wrapper) return
  wrapper.classList.remove(...Object.values(FRAME_CLASS))
  wrapper.classList.add(FRAME_CLASS[state])
  wrapper.style.setProperty('--nb-w', `${size.width}px`)
  wrapper.style.setProperty('--nb-h', `${size.height}px`)
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
