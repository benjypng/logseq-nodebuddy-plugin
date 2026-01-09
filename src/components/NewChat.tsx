import {
  Button,
  Center,
  Container,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { IconPlus } from '@tabler/icons-react'
import { Controller, SubmitHandler, useForm } from 'react-hook-form'

import { useAutoFocus, useLogseqPage } from '../hooks'
import { NewPageFormValues } from '../types'
import { writeHistoryToGraph } from '../utils/write-chat-history-to-graph'

export const NewChat = () => {
  const { setPage } = useLogseqPage()
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    setFocus,
  } = useForm<NewPageFormValues>({
    defaultValues: { title: '' },
  })

  useAutoFocus(setFocus, 'title')

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
        </Stack>
      </Container>
    </Center>
  )
}
