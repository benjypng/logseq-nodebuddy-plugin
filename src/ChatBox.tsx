import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { TitleHeader, UserInput } from './components'
import { Avatar } from './components/Avatar'
import { MessageBubble } from './components/MessageBubble'
import { useLogseqPage } from './hooks'
import { getPageBlocks } from './mcp'
import { ChatFormValues, ChatMessage, ToolDecision } from './types'
import { isNodeBuddyPage } from './utils'
import { clearPendingDecisions, resolveDecision } from './wiki'

const WIKI_GREETING = `**Wiki Mode is on.** This conversation is ephemeral — it disappears when you close the sidebar.

Before any writes to your graph, I'll declare a plan. You'll see a single **Approve plan** card; approving it lets me execute every step without further prompts. You'll see each write as it happens, and a final status report when the operation is done.

Slash commands:

- \`/session-start\` — snapshot of the graph: page counts by type and the last 5 days of journal activity.
- \`/ingest <source>\` — file a source as a \`#Source\` page plus seeded \`#Concept\` / \`#Entity\` / \`#Question\` pages. \`<source>\` can be a URL (fetched automatically), \`[[Page Name]]\` or page UUID (promote an existing graph page in place), \`block:<uuid>\` (treat a block as the source), or pasted text.
- \`/query <question>\` — answer from your graph (not raw sources), with \`[[Page Name]]\` citations. I'll offer to file substantive answers as \`#Synthesis\`.
- \`/lint\` — sweep for orphans, contradictions, stale claims; file findings as tasks on \`Lint Followups\`.
- \`/lint-seedlings\` — cluster \`#Seedling\` blocks by theme and propose Promote / Link / Merge / Leave for each.

Or just ask me anything — I'll use the read tools to look it up.`

export const ChatBox = () => {
  const { page, wikiMode } = useLogseqPage()
  const viewport = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const formMethods = useForm<ChatFormValues>({
    defaultValues: { prompt: '' },
  })
  useEffect(() => {
    if (wikiMode) {
      setMessages([
        {
          id: 'wiki-greeting',
          role: 'buddy',
          content: WIKI_GREETING,
        },
      ])
      clearPendingDecisions()
      return
    }
    const getExistingMessages = async () => {
      if (!page) return
      const nodeBuddyPage = await isNodeBuddyPage(page.id)
      if (nodeBuddyPage) {
        const currPbt = await getPageBlocks(page.name)
        if (currPbt.length === 0) {
          setMessages([
            {
              id: 'init-1',
              role: 'buddy',
              content:
                'I am NodeBuddy, your Logseq AI assistant. Use #tag, [[block references]] or @currentpage to add blocks to your context. Feel free to ask me for any help!',
            },
          ])
        } else {
          setMessages(
            currPbt
              .filter((block) => block.fullTitle !== '')
              .map((block) => JSON.parse(block.fullTitle)),
          )
        }
      }
    }
    getExistingMessages()
  }, [page, wikiMode])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        logseq.toggleMainUI()
        return
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'n'
      ) {
        e.preventDefault()
        logseq.toggleMainUI()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    viewport.current?.scrollTo({
      top: viewport.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages])

  const handlePlanDecide = (planId: string, decision: ToolDecision) => {
    resolveDecision(planId, decision)
  }

  return (
    <FormProvider {...formMethods}>
      <TitleHeader />

      <div ref={viewport} className="nb-chat-viewport nb-scrollable">
        <div className="nb-chat-messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`nb-message-row nb-message-row--${msg.role}`}
            >
              {msg.role === 'buddy' && <Avatar role={'buddy'} />}
              <MessageBubble msg={msg} onPlanDecide={handlePlanDecide} />
              {msg.role === 'user' && <Avatar role={'user'} />}
            </div>
          ))}
        </div>
      </div>

      <UserInput messages={messages} setMessages={setMessages} />
    </FormProvider>
  )
}
