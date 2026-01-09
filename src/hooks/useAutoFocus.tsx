import { useEffect } from 'react'
import { Path, UseFormSetFocus } from 'react-hook-form'

import { ChatFormValues, NewPageFormValues, VisibilityProps } from '../types'

export const useAutoFocus = (
  setFocus: UseFormSetFocus<NewPageFormValues | ChatFormValues>,
  name: Path<NewPageFormValues | ChatFormValues>,
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
