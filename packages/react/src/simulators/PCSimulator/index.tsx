import type { CSSProperties, ReactNode } from 'react'

import { usePrefix } from '../../hooks'
import { cx } from '../../utils'

export interface IPCSimulatorProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * 桌面端模拟器：占满可用区域。
 */
export const PCSimulator = (props: IPCSimulatorProps) => {
  const prefix = usePrefix('pc-simulator')
  return (
    <div {...props} className={cx(prefix, props.className)}>
      {props.children}
    </div>
  )
}

PCSimulator.displayName = 'PCSimulator'
