import { IconBook2, IconFileText, IconPencilPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { useLogseqPage } from '../hooks'
import { formatChatName, getModelNameFromSettings } from '../utils'

export const TitleHeader = () => {
  const { page, setPage, wikiMode, setWikiMode } = useLogseqPage()
  const [modelName, setModelName] = useState('')
  const badgeLabel = formatChatName(page?.name ?? '')

  const goToChatHistory = () => {
    if (!page) return
    logseq.App.pushState('page', {
      name: page.name,
    })
  }

  const goHome = () => {
    setPage(null)
    setWikiMode(false)
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
      </div>
      <div className="nb-header__actions">
        {wikiMode ? (
          <span className="nb-header__btn nb-header__btn--active">
            <IconBook2 style={{ width: '12px', height: '12px' }} />
            Wiki Mode
          </span>
        ) : (
          page && (
            <button
              type="button"
              title="Go to chat history"
              onClick={goToChatHistory}
              className="nb-header__btn"
            >
              <IconFileText style={{ width: '12px', height: '12px' }} />
              {badgeLabel}
            </button>
          )
        )}
        <button
          type="button"
          title="Back to home"
          onClick={goHome}
          className="nb-header__btn nb-header__btn--outlined"
        >
          <IconPencilPlus style={{ width: '12px', height: '12px' }} />
        </button>
      </div>
    </div>
  )
}
