import { ThemeIcon } from '@mantine/core'
import { IconRobot } from '@tabler/icons-react'

import { AvatarProps } from '../types'

export const Avatar = ({ role }: AvatarProps) => {
  return (
    <ThemeIcon
      radius="xl"
      size="md"
      variant={role === 'buddy' ? 'light' : 'filled'}
      color={role === 'buddy' ? 'blue' : 'gray'}
    >
      <IconRobot size={16} />
    </ThemeIcon>
  )
}
