import { useContext } from 'react'

import { ConfigProvider } from './ConfigProvider'
import { DesignerContext } from './context'
import type { IDesignerLayoutProps } from './types'

/**
 * 布局容器。未包裹 ConfigProvider 时自动创建。
 */
export const Layout = (props: IDesignerLayoutProps) => {
  const context = useContext(DesignerContext)
  if (!context) {
    return <ConfigProvider {...props} />
  }
  return <>{props.children}</>
}

Layout.displayName = 'Layout'
