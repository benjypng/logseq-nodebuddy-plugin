import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { TitleHeader, UserInput } from './components'
import { Avatar } from './components/Avatar'
import { MessageBubble } from './components/MessageBubble'
import { getClaudeMdInstructions } from './constants'
import { ChatFormValues, ChatMessage, ToolDecision } from './types'
import { resolveDecision } from './wiki'

const WIKI_GREETING = `**Wiki Mode is on.** This conversation is ephemeral — it disappears when you close the sidebar.

Before any writes to your graph, I'll declare a plan. You'll see a single **Approve plan** card; approving it lets me execute every step without further prompts. You'll see each write as it happens, and a final status report when the operation is done.

Slash commands:

- \`/session-start\` — snapshot of the graph: page counts by type and the last 5 days of journal activity.
- \`/ingest <source>\` — file a source as a \`#Source\` page plus seeded \`#Concept\` / \`#Entity\` / \`#Question\` pages. \`<source>\` is one of:
  - **URL** — \`/ingest https://example.com/article\` (auto-fetched)
  - **\`page:<title>\`** — \`/ingest page:My Page Title\` (promote an existing page in place; spaces and colons in the title are fine)
  - **\`uuid:<uuid>\`** — \`/ingest uuid:6914813f-2f61-4da4-9f93-08c405a29fa5\` (tries page first, falls back to block)
  - **pasted text** — \`/ingest some rough notes about X\` (catch-all)
- \`/query <question>\` — answer from your graph (not raw sources), with \`[[Page Name]]\` citations. I'll offer to file substantive answers as \`#Synthesis\`.
- \`/lint\` — sweep for orphans, contradictions, stale claims; file findings as tasks on \`Lint Followups\`.
- \`/lint-seedlings\` — cluster \`#Seedling\` blocks by theme and propose Promote / Link / Merge / Leave for each.

Or just ask me anything — I'll use the read tools to look it up.`

/**
 * The conversation that seeds a fresh session. Lives here but is owned by
 * NodeBuddyContainer's state so the session survives minimise/restore (ChatBox
 * unmounts while minimised) and is only cleared on reset or when Logseq closes.
 */
export const createGreetingMessages = (): ChatMessage[] => [
  {
    id: 'wiki-greeting',
    role: 'buddy',
    content: WIKI_GREETING,
  },
]

export const ChatBox = ({
  messages,
  setMessages,
  draft,
  setDraft,
}: {
  messages: ChatMessage[]
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>
  draft: string
  setDraft: Dispatch<SetStateAction<string>>
}) => {
  const viewport = useRef<HTMLDivElement>(null)
  // null = still checking, false = no CLAUDE.md (gate), true = ready.
  const [claudeMdReady, setClaudeMdReady] = useState<boolean | null>(null)

  const formMethods = useForm<ChatFormValues>({
    defaultValues: { prompt: draft },
  })

  useEffect(() => {
    const sub = formMethods.watch((value) => setDraft(value.prompt ?? ''))
    return () => sub.unsubscribe()
  }, [formMethods, setDraft])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      const text = await getClaudeMdInstructions()
      if (!cancelled) setClaudeMdReady(text.length > 0)
    }
    check()
    const onVisible = () => check()
    logseq.on('ui:visible:changed', onVisible)
    return () => {
      cancelled = true
      logseq.off('ui:visible:changed', onVisible)
    }
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

      {claudeMdReady === false ? (
        <div className="nb-claude-md-gate">
          Add a <code>CLAUDE.md</code> page with at least one non-empty block to
          this graph to use NodeBuddy.
        </div>
      ) : claudeMdReady === true ? (
        <UserInput messages={messages} setMessages={setMessages} />
      ) : null}
    </FormProvider>
  )
}
