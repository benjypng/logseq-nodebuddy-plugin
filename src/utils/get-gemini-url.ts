import { getModelNameFromSettings } from '.'

export const getGeminiUrl = () =>
  `https://generativelanguage.googleapis.com/v1beta/models/${getModelNameFromSettings()}:generateContent`
