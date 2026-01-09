import { Flex, ScrollArea, Stack, useMantineColorScheme } from '@mantine/core'
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'buddy',
      content:
        'I am ready. Select blocks in your graph to set context, or just ask me a question.',
    },
  ])

  const formMethods = useForm<ChatFormValues>({
    defaultValues: { prompt: '' },
  })
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  useEffect(() => {
    const getExistingMessages = async () => {
      if (!page) return
      const nodeBuddyPage = await isNodeBuddyPage(page.id)

      if (nodeBuddyPage) {
        const currPbt = await logseq.Editor.getPageBlocksTree(page.name)
        if (!currPbt) return
        setMessages(
          currPbt
            .filter((block) => block.content !== '')
            .map((block) => JSON.parse(block.title)),
        )
      }
    }
    getExistingMessages()
  }, [page])

  useEffect(() => {
    const cleanup = logseq.App.onThemeModeChanged(({ mode }) => {
      setColorScheme(mode)
    })
    return () => cleanup()
  }, [])

  useEffect(() => {
    // Handle shortcut to toggle UI
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

      <ScrollArea flex={1} p="md" viewportRef={viewport}>
        <Stack gap="md">
          {messages.map((msg) => (
            <Flex
              key={msg.id}
              justify={msg.role === 'user' ? 'flex-end' : 'flex-start'}
              align="flex-start"
              gap="xs"
            >
              {msg.role === 'buddy' && <Avatar role={'buddy'} />}

              <MessageBubble msg={msg} colorScheme={colorScheme} />

              {msg.role === 'user' && <Avatar role={'user'} />}
            </Flex>
          ))}
        </Stack>
      </ScrollArea>

      <UserInput messages={messages} setMessages={setMessages} />
    </FormProvider>
  )
}
