import { Badge, Code, Group, rem, Stack, Text } from '@mantine/core'
import { IconFileText } from '@tabler/icons-react'

import { useLogseqPage } from '../hooks'
import { getModelNameFromSettings } from '../utils'

export const TitleHeader = () => {
  const { page } = useLogseqPage()

  return (
    <Group align="center" justify="space-between" p="sm">
      <Stack gap={0}>
        <Text fw={700} size="md">
          NodeBuddy
        </Text>
        <Code>{getModelNameFromSettings()}</Code>
      </Stack>
      <Badge
        variant="filled"
        leftSection={
          <IconFileText style={{ width: rem(12), height: rem(12) }} />
        }
      >
        {page?.name.replace(`logseq.settings?.nodeBuddyTag as string:`, '')}
      </Badge>
    </Group>
  )
}
