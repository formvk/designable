import { observer } from '@formvk/reactive-react'
import type { CSSProperties, ReactNode } from 'react'

import { usePrefix, useScreen } from '../../hooks'
import { cx } from '../../utils'

export interface IMobileSimulatorProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * 移动端模拟器：纯 CSS 手机外壳，屏幕区域由画布填充。
 */
export const MobileSimulator = observer((props: IMobileSimulatorProps) => {
  const prefix = usePrefix('mobile-simulator')
  const screen = useScreen()
  const flip = screen.flip

  return (
    <div {...props} className={cx(prefix, props.className)}>
      <div className={`${prefix}-stage`}>
        <div className={cx(`${prefix}-device`, { [`${prefix}-device-flip`]: flip })}>
          <div className={`${prefix}-notch`} />
          <div className={`${prefix}-screen`}>{props.children}</div>
        </div>
      </div>
    </div>
  )
})

MobileSimulator.displayName = 'MobileSimulator'
