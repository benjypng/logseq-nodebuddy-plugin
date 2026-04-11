import { IconSend } from '@tabler/icons-react'
import { useCallback, useEffect, useRef } from 'react'
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
      logseq.UI.showMsg(`Failed to reach Gemini: ${String(e)}`, 'error')
      setMessages((prev) => prev.filter((msg) => msg.id !== buddyId))
    }
  }

  const AutosizeTextarea = ({
    value,
    onChange,
    error,
    onKeyDown,
  }: {
    value: string
    onChange: (value: string) => void
    error?: string
    onKeyDown: (e: React.KeyboardEvent) => void
  }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const resize = useCallback(() => {
      const el = textareaRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`
    }, [])

    useEffect(() => {
      resize()
    }, [value, resize])

    return (
      <div className="nb-input-wrapper">
        {error && <span className="nb-input-error">{error}</span>}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask NodeBuddy..."
          rows={1}
          className={`nb-textarea ${error ? 'nb-textarea--error' : ''}`}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="nb-input-bar">
        <Controller
          name="prompt"
          control={control}
          rules={{ required: 'Ask me something!' }}
          render={({ field, fieldState: { error } }) => (
            <AutosizeTextarea
              value={field.value}
              onChange={field.onChange}
              error={error?.message}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(onSubmit)()
                }
              }}
            />
          )}
        />
        <button type="submit" aria-label="Send message" className="nb-send-btn">
          <IconSend size={16} />
        </button>
      </div>
    </form>
  )
}
