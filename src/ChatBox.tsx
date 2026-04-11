import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { TitleHeader, UserInput } from './components'
import { Avatar } from './components/Avatar'
import { MessageBubble } from './components/MessageBubble'
import { useLogseqPage } from './hooks'
import { ChatFormValues, ChatMessage } from './types'
import { isNodeBuddyPage } from './utils'

export const ChatBox = () => {
  const { page } = useLogseqPage()
  const viewport = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const formMethods = useForm<ChatFormValues>({
    defaultValues: { prompt: '' },
  })
  useEffect(() => {
    const getExistingMessages = async () => {
      if (!page) return
      const nodeBuddyPage = await isNodeBuddyPage(page.id)
      if (nodeBuddyPage) {
        const currPbt = await logseq.Editor.getPageBlocksTree(page.name)
        if (!currPbt) return
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
  }, [page])

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
              <MessageBubble msg={msg} />
              {msg.role === 'user' && <Avatar role={'user'} />}
            </div>
          ))}
        </div>
      </div>

      <UserInput messages={messages} setMessages={setMessages} />
    </FormProvider>
  )
}
