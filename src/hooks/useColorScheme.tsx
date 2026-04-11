import { createContext, useContext } from 'react'

export type ColorScheme = 'light' | 'dark'

export interface ColorSchemeContextInterface {
  colorScheme: ColorScheme
  setColorScheme: (scheme: ColorScheme) => void
}

export const ColorSchemeContext =
  createContext<ColorSchemeContextInterface | null>(null)

export const useColorScheme = () => {
  const context = useContext(ColorSchemeContext)
  if (!context) {
    throw new Error(
      'useColorScheme must be used within a ColorSchemeContext.Provider',
    )
  }
  return context
}
