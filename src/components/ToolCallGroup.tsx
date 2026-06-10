import {
  IconAlertTriangle,
  IconCheck,
  IconChevronRight,
  IconLoader2,
} from '@tabler/icons-react'
import { useState } from 'react'

import type { ToolCall } from '../types'
import { ToolCallCard } from './ToolCallCard'

interface ToolCallGroupProps {
  calls: ToolCall[]
}

/**
 * Collapses a run of tool calls under a single "Processing" toggle so the chat
 * bubble stays concise. Collapsed by default; the header still surfaces live
 * progress (running count / done / failed) without forcing the list open. The
 * individual ToolCallCards retain their own per-call expand when opened.
 */
export const ToolCallGroup = ({ calls }: ToolCallGroupProps) => {
  const [expanded, setExpanded] = useState(false)

  const total = calls.length
  const active = calls.filter(
    (c) => c.status === 'running' || c.status === 'pending',
  ).length
  const failed = calls.filter(
    (c) => c.status === 'errored' || c.status === 'blocked',
  ).length
  const done = calls.filter((c) => c.status === 'completed').length

  const phase = active > 0 ? 'running' : failed > 0 ? 'errored' : 'completed'

  const summary =
    active > 0
      ? `Processing… ${done}/${total}`
      : failed > 0
        ? `Processed ${total} step${total === 1 ? '' : 's'} · ${failed} failed`
        : `Processed ${total} step${total === 1 ? '' : 's'}`

  return (
    <div className={`nb-tool-group nb-tool-group--${phase}`}>
      <button
        type="button"
        className="nb-tool-group__header"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <IconChevronRight
          size={13}
          style={{
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.1s',
            flexShrink: 0,
          }}
        />
        {active > 0 ? (
          <IconLoader2 size={13} className="nb-tool-group__spinner" />
        ) : failed > 0 ? (
          <IconAlertTriangle size={13} />
        ) : (
          <IconCheck size={13} />
        )}
        <span className="nb-tool-group__label">{summary}</span>
      </button>

      {expanded && (
        <div className="nb-tool-calls">
          {calls.map((call) => (
            <ToolCallCard key={call.id} call={call} />
          ))}
        </div>
      )}
    </div>
  )
}
