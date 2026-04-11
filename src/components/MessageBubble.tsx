import { IconCheck, IconCopy } from '@tabler/icons-react'
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { MessageBubbleProps } from '../types'

export const MessageBubble = ({ msg }: MessageBubbleProps) => {
  const { role, content, context } = msg
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="nb-bubble-wrapper">
      <div className={`nb-bubble nb-bubble--${role}`}>
        <button
          type="button"
          onClick={handleCopy}
          className={`nb-bubble__copy-btn ${copied ? 'nb-bubble__copy-btn--copied' : ''}`}
        >
          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
        </button>

        <div className="nb-markdown">
          {content === 'Thinking...' ? (
            <div className="nb-thinking">
              <span>Thinking</span>
              <span className="nb-thinking__dots">
                <span className="nb-thinking__dot" />
                <span className="nb-thinking__dot" />
                <span className="nb-thinking__dot" />
              </span>
            </div>
          ) : (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          )}
        </div>
      </div>

      {context && (
        <div className="nb-bubble__context">
          Attached {context.length} blocks
        </div>
      )}
    </div>
  )
}
