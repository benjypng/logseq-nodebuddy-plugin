import { IconFriends } from '@tabler/icons-react'
import { useSyncExternalStore } from 'react'

import { thinkingStore } from '../thinking-state'
import { windowStore } from '../window-state'

export const NodeBuddyFab = () => {
  const isThinking = useSyncExternalStore(
    thinkingStore.subscribe,
    thinkingStore.isThinking,
  )

  return (
    <button
      type="button"
      className={`nb-fab ${isThinking ? 'nb-fab--thinking' : ''}`}
      title={isThinking ? 'NodeBuddy is thinking…' : 'Open NodeBuddy'}
      aria-label="Open NodeBuddy"
      onClick={() => windowStore.set(windowStore.getLastOpenState())}
    >
      <IconFriends size={26} />
    </button>
  )
}
