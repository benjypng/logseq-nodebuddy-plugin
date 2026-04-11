import { PageEntity } from '@logseq/libs/dist/LSPlugin'
import { IconMessage, IconPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

import { useAutoFocus, useLogseqPage } from '../hooks'
import { NewPageFormValues } from '../types'
import { formatChatName, writeHistoryToGraph } from '../utils'
import { format } from 'date-fns'

export const NewChat = () => {
  const { page, setPage } = useLogseqPage()
  const [existingChats, setExistingChats] = useState<PageEntity[]>()
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setFocus,
  } = useForm<NewPageFormValues>({
    defaultValues: { title: '' },
  })

  useAutoFocus(setFocus, 'title')

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

      if (pagesContainingTags && pagesContainingTags.length > 0) {
        setExistingChats(
          pagesContainingTags.sort((a, b) => b.createdAt - a.createdAt),
        )
      }
    }
    getExistingChats()

    logseq.on('ui:visible:changed', getExistingChats)
    return () => {
      logseq.off('ui:visible:changed', getExistingChats)
    }
  }, [page])

  const onSubmit: SubmitHandler<NewPageFormValues> = async (data) => {
    let page
    if (data.title) {
      page = await writeHistoryToGraph.createPageAndAddTag(data.title.trim())
    } else {
      const now = format(new Date(), 'yyyy-MM-dd@HH:mm:ss')
      page = await writeHistoryToGraph.createPageAndAddTag(now)
    }
    setPage(page)
  }

  return (
    <div className="nb-new-chat">
      <div className="nb-new-chat__inner">
        <div className="nb-new-chat__content">
          <div className="nb-new-chat__heading">
            <h2 className="nb-new-chat__title">New Session</h2>
            <p className="nb-new-chat__subtitle">
              Start by creating a page to store this conversation history.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="nb-new-chat__form">
            <div className="nb-new-chat__form-fields">
              <Controller
                name="title"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <div>
                    {error && (
                      <span className="nb-new-chat__error">
                        {error.message}
                      </span>
                    )}
                    <input
                      {...field}
                      type="text"
                      placeholder="e.g. Quantum Physics Research"
                      disabled={isSubmitting}
                      autoFocus
                      className={`nb-new-chat__input ${error ? 'nb-new-chat__input--error' : ''}`}
                    />
                  </div>
                )}
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="nb-new-chat__submit"
              >
                <IconPlus size={16} />
                {isSubmitting ? 'Creating...' : 'Start Chat'}
              </button>
            </div>
          </form>

          {existingChats && existingChats.length > 0 && (
            <>
              <div className="nb-divider">
                <div className="nb-divider__line" />
                <span className="nb-divider__text">or resume session</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
