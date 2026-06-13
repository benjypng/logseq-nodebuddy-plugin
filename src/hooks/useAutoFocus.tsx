import { useEffect } from 'react'
import { Path, UseFormSetFocus } from 'react-hook-form'

import { ChatFormValues, VisibilityProps } from '../types'

export const useAutoFocus = (
  setFocus: UseFormSetFocus<ChatFormValues>,
  name: Path<ChatFormValues>,
) => {
  useEffect(() => {
    const handleVisibility = ({ visible }: VisibilityProps) => {
      if (visible) {
        setTimeout(() => {
          window.focus()
          setFocus(name)
        }, 100)
      }
    }
    logseq.on('ui:visible:changed', handleVisibility)
    return () => {
      logseq.off('ui:visible:changed', handleVisibility)
    }
  }, [setFocus, name])
}
