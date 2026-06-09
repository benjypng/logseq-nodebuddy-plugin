import { IconMaximize, IconMinimize, IconMinus } from '@tabler/icons-react'

import type { WindowState } from '../window-state'
import { windowStore } from '../window-state'

interface Props {
  windowState: WindowState
}

export const WindowControls = ({ windowState }: Props) => {
  const isMaximised = windowState === 'maximised'
  return (
    <div className="nb-window-controls">
      <button
        type="button"
        className="nb-window-controls__btn"
        title={isMaximised ? 'Restore down' : 'Maximise'}
        aria-label={isMaximised ? 'Restore down' : 'Maximise'}
        onClick={() => windowStore.set(isMaximised ? 'expanded' : 'maximised')}
      >
        {isMaximised ? <IconMinimize size={15} /> : <IconMaximize size={15} />}
      </button>
      <button
        type="button"
        className="nb-window-controls__btn"
        title="Minimise"
        aria-label="Minimise"
        onClick={() => windowStore.set('minimised')}
      >
        <IconMinus size={15} />
      </button>
    </div>
  )
}
