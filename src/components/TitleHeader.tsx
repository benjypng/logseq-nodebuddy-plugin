import { Code, Group, Text } from '@mantine/core'

import { getModelNameFromSettings } from '../utils'

export const TitleHeader = () => {
  return (
    <Group align="flex-end" justify="space-between" p="sm">
      <Text fw={700} size="lg">
        NodeBuddy
      </Text>
      <Code>{getModelNameFromSettings()}</Code>
    </Group>
  )
}
