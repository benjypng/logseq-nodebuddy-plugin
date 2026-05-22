import { tools } from './tools'
import type { Tool, ToolName } from './types'

export * from './tools'
export type { Tool, ToolName, ToolRegistry } from './types'

export const getTool = (name: ToolName): Tool<unknown, unknown> | undefined =>
  tools[name]

export const listTools = (): Tool<unknown, unknown>[] => Object.values(tools)
