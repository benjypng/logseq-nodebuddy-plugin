import { Flex, Paper, useMantineColorScheme } from '@mantine/core'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { FormValues } from './types'

export const NodeBuddyContainer = () => {
  const formMethods = useForm<FormValues>({
    defaultValues: { prompt: '' },
  })

  const { colorScheme, setColorScheme } = useMantineColorScheme()
  useEffect(() => {
    const cleanup = logseq.App.onThemeModeChanged(({ mode }) => {
      setColorScheme(mode)
    })
    return () => cleanup()
  }, [])

  useEffect(() => {
    // Handle shortcut to toggle UI
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        logseq.toggleMainUI()
        return
      }
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === 'n'
      ) {
        e.preventDefault()
        logseq.toggleMainUI()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <FormProvider {...formMethods}>
      <Paper
        p="md"
        w="100%"
        h="100vh"
        mih="100vh"
        radius={0}
        bg="body"
        c="text"
        shadow={colorScheme === 'dark' ? 'none' : 'xl'}
        style={{ overflowY: 'auto' }}
      >
        <Flex direction="column" gap="xs">
          Hello World
        </Flex>
      </Paper>
    </FormProvider>
  )
}
