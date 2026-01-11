import {
  Anchor,
  Box,
  Code,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { MessageBubbleProps } from '../types'

export const MessageBubble = ({ colorScheme, msg }: MessageBubbleProps) => {
  const { role, content, context } = msg

  const markdownComponents: any = {
    p: ({ children }: any) => (
      <Text component="div" size="sm" mb="xs" style={{ lineHeight: 1.5 }}>
        {children}
      </Text>
    ),
    code: ({ inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '')
      const isBlock = match || inline === false

      if (!isBlock) {
        return <Code {...props}>{children}</Code>
      }

      return (
        <Code block mb="sm" {...props} style={{ overflowX: 'auto' }}>
          {children}
        </Code>
      )
    },
    a: ({ href, children }: any) => (
      <Anchor href={href} target="_blank" rel="noopener noreferrer" size="sm">
        {children}
      </Anchor>
    ),
    h1: ({ children }: any) => (
      <Title order={3} size="h5" mb="xs">
        {children}
      </Title>
    ),
    h2: ({ children }: any) => (
      <Title order={4} size="h6" mb="xs">
        {children}
      </Title>
    ),
    h3: ({ children }: any) => (
      <Text fw={700} size="sm" mb="xs">
        {children}
      </Text>
    ),
    ul: ({ children }: any) => (
      <Box
        component="ul"
        pl="md"
        my="xs"
        style={{ fontSize: 'var(--mantine-font-size-sm)' }}
      >
        {children}
      </Box>
    ),
    ol: ({ children }: any) => (
      <Box
        component="ol"
        pl="md"
        my="xs"
        style={{ fontSize: 'var(--mantine-font-size-sm)' }}
      >
        {children}
      </Box>
    ),
    li: ({ children }: any) => <li style={{ marginBottom: 4 }}>{children}</li>,
  }

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
        <Box component="div" style={{ wordBreak: 'break-word' }}>
          {content === 'Thinking...' ? (
            <Loader type="dots" size="xs" />
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
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
