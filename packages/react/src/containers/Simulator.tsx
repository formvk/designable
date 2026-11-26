import { ScreenType } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'
import type { CSSProperties, ReactNode } from 'react'

import { useScreen } from '../hooks'
import { MobileSimulator, PCSimulator, ResponsiveSimulator } from '../simulators'

export interface ISimulatorProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

/**
 * 模拟器切换容器，根据屏幕类型渲染不同外壳。
 */
export const Simulator = observer((props: ISimulatorProps) => {
  const screen = useScreen()
  const type = screen.type

  if (type === ScreenType.Mobile) return <MobileSimulator {...props} />
  if (type === ScreenType.Responsive) return <ResponsiveSimulator {...props} />
  return <PCSimulator {...props} />
})

Simulator.displayName = 'Simulator'
