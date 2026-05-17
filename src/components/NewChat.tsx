import { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { IconMessage, IconPencil, IconPlus } from '@tabler/icons-react'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

import { useLogseqPage } from '../hooks'
import { NewPageFormValues } from '../types'
import { formatChatName, writeHistoryToGraph } from '../utils'

export const NewChat = () => {
  const { setPage } = useLogseqPage()
  const [existingChats, setExistingChats] = useState<PageEntity[]>()
  const [namingMode, setNamingMode] = useState(false)
  const [creating, setCreating] = useState(false)

  const { control, handleSubmit, setFocus } = useForm<NewPageFormValues>({
    defaultValues: { title: '' },
  })

  useEffect(() => {
    const getExistingChats = async () => {
      const tagName = logseq.settings?.nodeBuddyTag as string
      if (!tagName) return
      const tagPage = await logseq.Editor.getPage(tagName)
      if (!tagPage) return
      const tagIdent = tagPage.ident
      if (!tagIdent) return

      const blocksContainingTags = await logseq.Editor.getTagObjects(tagIdent)
      if (!blocksContainingTags) return
      const pagesContainingTags = blocksContainingTags.filter(
        (block) => !block.page,
      ) as unknown as PageEntity[]

      setExistingChats(
        pagesContainingTags.sort((a, b) => b.createdAt - a.createdAt),
      )
    }
    getExistingChats()

    logseq.on('ui:visible:changed', getExistingChats)
    return () => {
      logseq.off('ui:visible:changed', getExistingChats)
    }
  }, [])

  useEffect(() => {
    if (namingMode) setFocus('title')
  }, [namingMode, setFocus])

  const startAutoNamedChat = async () => {
    if (creating) return
    setCreating(true)
    try {
      const now = format(new Date(), 'yyyy-MM-dd@HH:mm')
      const page = await writeHistoryToGraph.createPageAndAddTag(now)
      setPage(page)
    } finally {
      setCreating(false)
    }
  }

  const onSubmitNamed: SubmitHandler<NewPageFormValues> = async (data) => {
    const title = data.title.trim()
    if (!title) return
    setCreating(true)
    try {
      const page = await writeHistoryToGraph.createPageAndAddTag(title)
      setPage(page)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="nb-new-chat">
      <div className="nb-new-chat__inner">
        <div className="nb-new-chat__content">
          <div className="nb-new-chat__heading">
            <h2 className="nb-new-chat__title">NodeBuddy</h2>
            <p className="nb-new-chat__subtitle">
              Start a new chat or resume an existing one.
            </p>
          </div>

          <div className="nb-new-chat__actions">
            {!namingMode ? (
              <>
                <button
                  type="button"
                  onClick={startAutoNamedChat}
                  disabled={creating}
                  className="nb-new-chat__submit"
                >
                  <IconPlus size={16} />
                  {creating ? 'Creating...' : 'Start new chat'}
                </button>
                <button
                  type="button"
                  onClick={() => setNamingMode(true)}
                  className="nb-new-chat__link-btn"
                >
                  <IconPencil size={12} />
                  Name it yourself
                </button>
              </>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmitNamed)}
                className="nb-new-chat__named-form"
              >
                <Controller
                  name="title"
                  control={control}
                  rules={{ required: 'Enter a name' }}
                  render={({ field, fieldState: { error } }) => (
                    <div className="nb-new-chat__named-field">
                      <input
                        {...field}
                        type="text"
                        placeholder="Chat name"
                        disabled={creating}
                        className={`nb-new-chat__input ${error ? 'nb-new-chat__input--error' : ''}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            setNamingMode(false)
                          }
                        }}
                      />
                      {error && (
                        <span className="nb-new-chat__error">
                          {error.message}
                        </span>
                      )}
                    </div>
                  )}
                />
                <div className="nb-new-chat__named-actions">
                  <button
                    type="button"
                    onClick={() => setNamingMode(false)}
                    className="nb-new-chat__secondary-btn"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="nb-new-chat__submit nb-new-chat__submit--compact"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {existingChats && existingChats.length > 0 && (
            <div className="nb-new-chat__resume">
              <div className="nb-divider">
                <div className="nb-divider__line" />
                <span className="nb-divider__text">Resume chat</span>
                <div className="nb-divider__line" />
              </div>
              <div className="nb-chat-list nb-scrollable">
                <div className="nb-chat-list__items">
                  {existingChats.map((chat) => (
                    <button
                      key={chat.id}
                      type="button"
                      onClick={() => setPage(chat)}
                      className="nb-chat-list__item"
                    >
                      <IconMessage
                        size={14}
                        className="nb-chat-list__item-icon"
                      />
                      <span className="nb-chat-list__item-name">
                        {formatChatName(chat.name)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
