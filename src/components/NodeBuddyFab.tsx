import { IconFriends } from '@tabler/icons-react'

import { windowStore } from '../window-state'

export const NodeBuddyFab = () => (
  <button
    type="button"
    className="nb-fab"
    title="Open NodeBuddy"
    aria-label="Open NodeBuddy"
    onClick={() => windowStore.set(windowStore.getLastOpenState())}
  >
    <IconFriends size={26} />
  </button>
)
