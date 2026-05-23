import { IconChevronRight } from '@tabler/icons-react'
import { useState } from 'react'

import type { ToolCall } from '../types'

interface ToolCallCardProps {
  call: ToolCall
}

const statusLabel: Record<ToolCall['status'], string> = {
  pending: 'Pending',
  running: 'Running…',
  completed: 'Done',
  errored: 'Errored',
  blocked: 'Blocked (no approved plan)',
}

export const ToolCallCard = ({ call }: ToolCallCardProps) => {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className={`nb-tool-card nb-tool-card--${call.status}`}>
      <div className="nb-tool-card__header">
        <button
          type="button"
          className="nb-tool-card__toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <IconChevronRight
            size={12}
            style={{
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.1s',
            }}
          />
        </button>
        <code className="nb-tool-card__name">{call.name}</code>
        <span className="nb-tool-card__status">{statusLabel[call.status]}</span>
      </div>
      {expanded && (
        <pre className="nb-tool-card__body">
          {JSON.stringify(call.input, null, 2)}
          {call.error && `\n\nError: ${call.error}`}
          {call.result !== undefined &&
            `\n\nResult:\n${JSON.stringify(call.result, null, 2).slice(0, 600)}`}
        </pre>
      )}
    </div>
  )
}
