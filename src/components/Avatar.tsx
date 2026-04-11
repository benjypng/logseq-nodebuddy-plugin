import { IconRobot } from '@tabler/icons-react'

import { AvatarProps } from '../types'

export const Avatar = ({ role }: AvatarProps) => {
  return (
    <div className={`nb-avatar nb-avatar--${role}`}>
      <IconRobot size={16} />
    </div>
  )
}
