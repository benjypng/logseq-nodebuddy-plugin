import { IconBook2, IconFileText } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { useLogseqPage } from '../hooks'
import { formatChatName, getModelNameFromSettings } from '../utils'

export const TitleHeader = () => {
  const { page, wikiMode } = useLogseqPage()
  const [modelName, setModelName] = useState('')
  const badgeLabel = formatChatName(page?.name ?? '')

  const goToChatHistory = () => {
    if (!page) return
    logseq.App.pushState('page', {
      name: page.name,
    })
  }

  useEffect(() => {
    setModelName(getModelNameFromSettings())
    const cleanup = logseq.onSettingsChanged(() => {
      setModelName(getModelNameFromSettings())
    })
    return () => {
      cleanup?.()
    }
  }, [])

  return (
    <div className="nb-header">
      <div className="nb-header__title-group">
        <span className="nb-header__title">NodeBuddy</span>
        <code className="nb-header__model">{modelName}</code>
        {wikiMode ? (
          <span className="nb-header__context nb-header__context--wiki">
            <IconBook2 size={12} />
            Wiki Mode
          </span>
        ) : (
          page && (
            <button
              type="button"
              title="Go to chat history"
              onClick={goToChatHistory}
              className="nb-header__context"
            >
              <IconFileText size={12} />
              <span className="nb-header__context-label">{badgeLabel}</span>
            </button>
          )
        )}
      </div>
    </div>
  )
}
