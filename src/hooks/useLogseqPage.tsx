import { createContext, useContext } from 'react'

import { LogseqPageContextInterface } from '../types'

export const LogseqPageContext =
  createContext<LogseqPageContextInterface | null>(null)

export const useLogseqPage = () => {
  const context = useContext(LogseqPageContext)
  if (!context) {
    throw new Error(
      'useLogseqPage must be used within a LogseqPageContext.Provider',
    )
  }
  return context
}
