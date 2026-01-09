import { ActionIcon, Group, Textarea } from '@mantine/core'
import { IconSend } from '@tabler/icons-react'
import { useEffect } from 'react'
import { Controller, SubmitHandler, useFormContext } from 'react-hook-form'

import { sendMessageToGemini } from '../api'
import {
  ChatMessage,
  FormValues,
  UserInputProps,
  VisibilityProps,
} from '../types'

export const UserInput = ({ messages, setMessages }: UserInputProps) => {
  const { control, handleSubmit, reset, setFocus } =
    useFormContext<FormValues>()

  useEffect(() => {
    const handleVisibility = ({ visible }: VisibilityProps) => {
      if (visible) {
        setTimeout(() => {
          window.focus()
          setFocus('prompt')
        }, 100)
      }
    }
    logseq.on('ui:visible:changed', handleVisibility)
    return () => {
      logseq.off('ui:visible:changed', handleVisibility)
    }
  }, [setFocus])

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!data.prompt.trim()) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: data.prompt,
      //TODO: Add support for context
    }

    const buddyId = (Date.now() + 1).toString()
    const initialBuddyMsg: ChatMessage = {
      id: buddyId,
      role: 'buddy',
      content: 'Thinking...',
    }

    setMessages((prev) => [...prev, userMsg, initialBuddyMsg])
    reset()

    try {
      const history = [...messages, userMsg]
      const responseContent = await sendMessageToGemini(history)

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === buddyId ? { ...msg, content: responseContent } : msg,
        ),
      )
    } catch (e) {
      logseq.UI.showMsg(`Failed to reach Gemini: ${String(e)}`, 'error') //
      setMessages((prev) => prev.filter((msg) => msg.id !== buddyId))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Group gap="sm" align="flex-end" mt="xs" p="sm">
        <Controller
          name="prompt"
          control={control}
          rules={{ required: 'Ask me something!' }}
          render={({ field, fieldState: { error } }) => (
            <Textarea
              {...field}
              placeholder="Ask NodeBuddy..."
              autosize
              minRows={1}
              maxRows={4}
              flex={1}
              error={error?.message}
              inputWrapperOrder={['label', 'description', 'error', 'input']}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(onSubmit)()
                }
              }}
            />
          )}
        />
        <ActionIcon
          type="submit"
          variant="filled"
          size="input-xs"
          aria-label="Send message"
          mb={0}
        >
          <IconSend />
        </ActionIcon>
      </Group>
    </form>
  )
}
