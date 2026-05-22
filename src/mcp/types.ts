export interface Tool<Args, Result> {
  name: string
  description: string
  run: (args: Args) => Promise<Result>
}

export type ToolName = string

export type ToolRegistry = Record<ToolName, Tool<unknown, unknown>>
