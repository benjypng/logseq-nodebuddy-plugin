export const GEMINI_TOOLS = [
  {
    function_declarations: [
      {
        name: 'create_page',
        description: 'Creates a new page in the Logseq graph.',
        parameters: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING', description: 'The title of the new page' },
          },
          required: ['title'],
        },
      },
      {
        name: 'append_block',
        description: 'Appends a text block to the end of a specific page.',
        parameters: {
          type: 'OBJECT',
          properties: {
            pageName: {
              type: 'STRING',
              description: 'The exact name of the page',
            },
            content: { type: 'STRING', description: 'The text content to add' },
          },
          required: ['pageName', 'content'],
        },
      },
    ],
  },
]

export const executeTool = async (name: string, args: any): Promise<object> => {
  console.log(`[NodeBuddy] Executing tool: ${name}`, args)

  try {
    switch (name) {
      case 'create_page': {
        const page = await logseq.Editor.createPage(
          args.title,
          {},
          { createFirstBlock: true },
        )
        return {
          result: page
            ? `Page "${page.name}" created successfully.`
            : 'Failed to create page.',
        }
      }

      case 'append_block': {
        const page = await logseq.Editor.getPage(args.pageName)
        if (!page) return { error: `Page "${args.pageName}" not found.` }

        await logseq.Editor.appendBlockInPage(page.uuid, args.content)
        return { result: `Block added to "${args.pageName}".` }
      }

      default:
        return { error: `Unknown tool: ${name}` }
    }
  } catch (e) {
    return { error: `Execution failed: ${e}` }
  }
}
