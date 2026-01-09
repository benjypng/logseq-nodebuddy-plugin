import {
  Divider,
  Flex,
  ScrollArea,
  Stack,
  useMantineColorScheme,
} from '@mantine/core'
import { useEffect, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { TitleHeader, UserInput } from './components'
import { Avatar } from './components/Avatar'
import { MessageBubble } from './components/MessageBubble'
import { ChatMessage, FormValues } from './types'

export const NodeBuddyContainer = () => {
  const viewport = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'buddy',
      content:
        'I am ready. Select blocks in your graph to set context, or just ask me a question.',
    },
  ])

  const formMethods = useForm<FormValues>({
    defaultValues: { prompt: '' },
  })
  const { colorScheme, setColorScheme } = useMantineColorScheme()

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
      <Flex direction="column" h="100vh" w="100%" bg="body">
        <TitleHeader />

        <Divider />

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
      </Flex>
    </FormProvider>
  )
}
