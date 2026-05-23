export interface JSONSchema {
  type: 'object'
  properties: Record<string, unknown>
  required?: string[]
  additionalProperties?: boolean
  $defs?: Record<string, unknown>
}

export interface Tool<Args, Result> {
  name: string
  description: string
  parameters: JSONSchema
  requiresConfirmation?: boolean
  run: (args: Args) => Promise<Result>
}

export type ToolName = string

export type ToolRegistry = Record<ToolName, Tool<unknown, unknown>>
