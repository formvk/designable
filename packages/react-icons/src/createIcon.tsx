import type { FC, ReactNode } from 'react'

import type { IconProps } from './types'

export interface CreateIconOptions {
  displayName?: string
  /** 图标内容（path/circle/rect 等） */
  children: ReactNode
}

/**
 * 创建 24x24 线性图标组件，统一描边风格
 */
export function createIcon(options: CreateIconOptions): FC<IconProps> {
  const IconComponent: FC<IconProps> = ({ size = '1em', ...props }) => (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {options.children}
    </svg>
  )
  IconComponent.displayName = options.displayName
  return IconComponent
}
