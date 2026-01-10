import { ActionIcon, Group, Textarea } from '@mantine/core'
import { IconSend } from '@tabler/icons-react'
import { Controller, SubmitHandler, useFormContext } from 'react-hook-form'

import { sendMessageToLLM } from '../api'
import { useAutoFocus, useLogseqPage } from '../hooks'
import { ChatFormValues, ChatMessage, UserInputProps } from '../types'
import { getPromptContext, writeHistoryToGraph } from '../utils'

export const UserInput = ({ messages, setMessages }: UserInputProps) => {
  const { page } = useLogseqPage()
  if (!page) return

  const { control, handleSubmit, reset, setFocus } =
    useFormContext<ChatFormValues>()

  useAutoFocus(setFocus, 'prompt')

  const onSubmit: SubmitHandler<ChatFormValues> = async (data) => {
    if (!data.prompt.trim()) return

    const promptContext = await getPromptContext(data.prompt)
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: data.prompt,
      context: promptContext,
    }
    await writeHistoryToGraph.writeMessage(page.name, {
      id: Date.now().toString(),
      role: 'user',
      content: data.prompt,
    })

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
      const responseContent = await sendMessageToLLM(history)
      await writeHistoryToGraph.writeMessage(page.name, {
        id: Date.now().toString(),
        role: 'buddy',
        content: responseContent,
      })

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
          size="input-sm"
          aria-label="Send message"
          mb={0}
        >
          <IconSend />
        </ActionIcon>
      </Group>
    </form>
  )
}
