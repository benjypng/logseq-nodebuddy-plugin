import { Box, Loader, Paper, Stack, Text } from '@mantine/core'

import { MessageBubbleProps } from '../types'

export const MessageBubble = ({ colorScheme, msg }: MessageBubbleProps) => {
  const { role, content, context } = msg

  return (
    <Stack gap={4} maw="80%">
      <Paper
        p="sm"
        radius="md"
        withBorder
        bg={
          role === 'user'
            ? colorScheme === 'dark'
              ? 'blue.9'
              : 'blue.1'
            : colorScheme === 'dark'
              ? 'dark.6'
              : 'gray.0'
        }
      >
        <Box component="div" style={{ whiteSpace: 'pre-wrap' }}>
          {content === 'Thinking...' ? (
            <Loader type="dots" size="xs" />
          ) : (
            <Text size="sm">{content}</Text>
          )}
        </Box>
      </Paper>

      {context && (
        <Text size="xs" c="dimmed" ta="right">
          Attached {context.length} blocks
        </Text>
      )}
    </Stack>
  )
}
