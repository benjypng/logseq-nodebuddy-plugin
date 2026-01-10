import { Button, Code, Group, rem, Stack, Text, Tooltip } from '@mantine/core'
import { IconFileText, IconPencilPlus } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { useLogseqPage } from '../hooks'
import { formatChatName, getModelNameFromSettings } from '../utils'

export const TitleHeader = () => {
  const { page, setPage } = useLogseqPage()
  const [modelName, setModelName] = useState('')
  const badgeLabel = formatChatName(page?.name ?? 'Error')

  const goToChatHistory = () => {
    logseq.App.pushState('page', {
      name: page?.name,
    })
  }

  useEffect(() => {
    setModelName(getModelNameFromSettings())
    const cleanup = logseq.onSettingsChanged(() => {
      setModelName(getModelNameFromSettings())
    })
    return () => {
      cleanup?.()
    }
  }, [])

  return (
    <Group align="center" justify="space-between" p="sm">
      <Stack gap={0}>
        <Text fw={700} size="md">
          NodeBuddy
        </Text>
        <Code>{modelName}</Code>
      </Stack>
      <Group gap={2}>
        <Tooltip label="Go to chat history">
          <Button
            leftSection={
              <IconFileText style={{ width: rem(12), height: rem(12) }} />
            }
            size="xs"
            radius="md"
            variant="subtle"
            onClick={goToChatHistory}
          >
            {badgeLabel}
          </Button>
        </Tooltip>
        <Tooltip label="Start a new chat">
          <Button
            size="xs"
            radius="md"
            color="gray"
            variant="outline"
            onClick={() => setPage(null)}
          >
            <IconPencilPlus style={{ width: rem(12), height: rem(12) }} />
          </Button>
        </Tooltip>
      </Group>
    </Group>
  )
}
