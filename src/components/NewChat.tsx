import { PageEntity } from '@logseq/libs/dist/LSPlugin'
import {
  Button,
  Center,
  Container,
  Divider,
  ScrollArea,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconMessage, IconPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

import { useAutoFocus, useLogseqPage } from '../hooks'
import { NewPageFormValues } from '../types'
import { formatChatName, writeHistoryToGraph } from '../utils'

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
        setExistingChats(pagesContainingTags)
      }
    }
    getExistingChats()

    // To handle when Logseq restarts
    logseq.on('ui:visible:changed', getExistingChats)
    return () => {
      logseq.off('ui:visible:changed', getExistingChats)
    }
  }, [page])

  const onSubmit: SubmitHandler<NewPageFormValues> = async (data) => {
    if (!data.title) return
    const page = await writeHistoryToGraph.createPageAndAddTag(
      data.title.trim(),
    )
    setPage(page)
  }

  return (
    <Center h="100%" bg="body">
      <Container size="xs">
        <Stack align="center" gap="lg">
          <Stack gap={0} align="center">
            <Title order={2}>New Session</Title>
            <Text c="dimmed" size="sm">
              Start by creating a page to store this conversation history.
            </Text>
          </Stack>

          <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
            <Stack gap="sm">
              <Controller
                name="title"
                control={control}
                rules={{ required: 'Title is required' }}
                render={({ field, fieldState: { error } }) => (
                  <TextInput
                    {...field}
                    placeholder="e.g. Quantum Physics Research"
                    size="xs"
                    radius="md"
                    error={error?.message}
                    disabled={isSubmitting}
                    autoFocus
                  />
                )}
              />
              <Button
                type="submit"
                size="xs"
                radius="md"
                fullWidth
                loading={isSubmitting}
                leftSection={<IconPlus size={18} />}
              >
                Start Chat
              </Button>
            </Stack>
          </form>

          {existingChats && existingChats.length > 0 && (
            <>
              <Divider
                label="or resume session"
                labelPosition="center"
                w="100%"
              />
              <ScrollArea h={200} w="100%" type="auto" offsetScrollbars>
                <Stack gap={4}>
                  {existingChats.map((chat) => (
                    <Button
                      key={chat.id}
                      variant="subtle"
                      color="gray"
                      fullWidth
                      justify="flex-start"
                      leftSection={<IconMessage size={14} />}
                      onClick={() => setPage(chat)}
                      styles={{
                        label: {
                          fontWeight: 400,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        },
                      }}
                    >
                      {formatChatName(chat.name)}
                    </Button>
                  ))}
                </Stack>
              </ScrollArea>
            </>
          )}
        </Stack>
      </Container>
    </Center>
  )
}
