import { IconSend } from '@tabler/icons-react'
import { useCallback, useEffect, useRef } from 'react'
import { Controller, SubmitHandler, useFormContext } from 'react-hook-form'

import { sendMessageToLLM, WikiModeRequiresClaudeError } from '../api'
import { useAutoFocus, useLogseqPage } from '../hooks'
import {
  ChatFormValues,
  ChatMessage,
  ToolCall,
  ToolCallCallbacks,
  UserInputProps,
} from '../types'
import { getPromptContext, writeHistoryToGraph } from '../utils'
import {
  awaitDecision,
  buildCommandPrompt,
  buildSessionStartContext,
  loadIngestSource,
  parseSlashCommand,
} from '../wiki'

const AutosizeTextarea = ({
  value,
  onChange,
  error,
  onKeyDown,
  wikiMode,
}: {
  value: string
  onChange: (value: string) => void
  error?: string
  onKeyDown: (e: React.KeyboardEvent) => void
  wikiMode: boolean
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

  const parsed = wikiMode ? parseSlashCommand(value) : null
  const isInvalidSlash = wikiMode && !parsed && value.trim().startsWith('/')

  const modifier = parsed
    ? 'nb-textarea--command'
    : isInvalidSlash
      ? 'nb-textarea--command-unknown'
      : ''

  return (
    <div className="nb-input-wrapper">
      {error && <span className="nb-input-error">{error}</span>}
      {parsed && (
        <span className="nb-command-chip" title="Slash command detected">
          /{parsed.cmd}
        </span>
      )}
      {isInvalidSlash && (
        <span className="nb-command-chip nb-command-chip--unknown">
          unknown command
        </span>
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={
          wikiMode
            ? 'Ask NodeBuddy… or /session-start /ingest /query /lint /lint-seedlings'
            : 'Ask NodeBuddy...'
        }
        rows={1}
        className={`nb-textarea ${error ? 'nb-textarea--error' : ''} ${modifier}`}
      />
    </div>
  )
}

export const UserInput = ({ messages, setMessages }: UserInputProps) => {
  const { page, wikiMode } = useLogseqPage()
  // ChatBox only mounts UserInput when there is a page OR wikiMode is on,
  // so at least one of these is true here.

  const { control, handleSubmit, reset, setFocus } =
    useFormContext<ChatFormValues>()

  useAutoFocus(setFocus, 'prompt')

  const persistToGraph = !wikiMode && !!page

  const onSubmit: SubmitHandler<ChatFormValues> = async (data) => {
    const rawInput = data.prompt
    if (!rawInput.trim()) return

    const displayContent = rawInput
    let promptForLLM = rawInput
    let promptContext = await getPromptContext(rawInput)

    const parsed = parseSlashCommand(rawInput)
    if (parsed && !wikiMode) {
      logseq.UI.showMsg(
        'Slash commands require Wiki Mode. Start a Wiki Mode session from the home screen.',
        'warning',
      )
      return
    }
    if (parsed && wikiMode) {
      promptContext = []
      try {
        if (parsed.cmd === 'ingest') {
          if (!parsed.args) {
            logseq.UI.showMsg(
              '/ingest needs a URL, [[Page Name]], page UUID, or pasted text.',
              'warning',
            )
            return
          }
          const ingestSource = await loadIngestSource(parsed.args)
          promptForLLM = buildCommandPrompt(parsed, { ingestSource })
        } else if (parsed.cmd === 'session-start') {
          const preFetched = await buildSessionStartContext()
          promptForLLM = buildCommandPrompt(parsed, { preFetched })
        } else {
          promptForLLM = buildCommandPrompt(parsed)
        }
      } catch (err) {
        logseq.UI.showMsg(
          `Slash command failed: ${err instanceof Error ? err.message : String(err)}`,
          'error',
        )
        return
      }
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: promptForLLM,
      context: promptContext,
    }
    if (persistToGraph && page) {
      await writeHistoryToGraph.writeMessage(page.name, {
        id: Date.now().toString(),
        role: 'user',
        content: displayContent,
      })
    }

    const buddyId = (Date.now() + 1).toString()
    const initialBuddyMsg: ChatMessage = {
      id: buddyId,
      role: 'buddy',
      content: 'Thinking...',
    }

    const displayUserMsg: ChatMessage = { ...userMsg, content: displayContent }
    setMessages((prev) => [...prev, displayUserMsg, initialBuddyMsg])
    reset()

    const toolCallbacks: ToolCallCallbacks = {
      onToolCallStart: (messageId, call) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, toolCalls: [...(m.toolCalls ?? []), call] }
              : m,
          ),
        )
      },
      onToolCallUpdate: (messageId, callId, partial) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  toolCalls: m.toolCalls?.map((c: ToolCall) =>
                    c.id === callId ? { ...c, ...partial } : c,
                  ),
                }
              : m,
          ),
        )
      },
      onPlanDeclared: (messageId, plan) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, plan } : m)),
        )
      },
      onPlanUpdate: (messageId, partial) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && m.plan
              ? { ...m, plan: { ...m.plan, ...partial } }
              : m,
          ),
        )
      },
      onPlanStepUpdate: (messageId, index, partial) => {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId || !m.plan) return m
            const nextSteps = m.plan.steps.map((s, i) =>
              i === index ? { ...s, ...partial } : s,
            )
            return { ...m, plan: { ...m.plan, steps: nextSteps } }
          }),
        )
      },
      awaitDecision,
    }

    try {
      const history = [...messages, userMsg]
      const responseContent = await sendMessageToLLM(history, {
        wikiMode,
        toolCallbacks,
        buddyMessageId: buddyId,
      })
      if (persistToGraph && page) {
        await writeHistoryToGraph.writeMessage(page.name, {
          id: Date.now().toString(),
          role: 'buddy',
          content: responseContent,
        })
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === buddyId ? { ...msg, content: responseContent } : msg,
        ),
      )
    } catch (e) {
      if (e instanceof WikiModeRequiresClaudeError) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === buddyId ? { ...msg, content: e.message } : msg,
          ),
        )
      } else {
        logseq.UI.showMsg(`Failed to reach model: ${String(e)}`, 'error')
        setMessages((prev) => prev.filter((msg) => msg.id !== buddyId))
      }
    }
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
              wikiMode={wikiMode}
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
