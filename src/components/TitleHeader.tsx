import { IconBook2 } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { getModelNameFromSettings } from '../utils'

export const TitleHeader = () => {
  const [modelName, setModelName] = useState('')

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
        <span className="nb-header__context nb-header__context--wiki">
          <IconBook2 size={12} />
          Wiki Mode
        </span>
      </div>
    </div>
  )
}
