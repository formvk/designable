import { icons as builtinIcons } from '@formvk/designable-react-icons'
import { observer } from '@formvk/reactive-react'
import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { ConfigProvider } from './ConfigProvider'
import { DesignerEngineContext } from './context'
import { useDesigner, useDesignerContext } from './hooks'
import { DesignerPluginProvider } from './plugins'
import type { IDesignerProps } from './types'
import { GhostWidget } from './widgets/GhostWidget'

interface IDesignerShellProps {
  engine: IDesignerProps['engine']
  icons?: IDesignerProps['icons']
  children?: ReactNode
}

const DesignerShell = observer((props: IDesignerShellProps) => {
  const { engine } = props
  const { i18n } = useDesignerContext()
  const language = i18n.getLanguage()

  useEffect(() => {
    engine.mount()
    return () => {
      engine.unmount()
    }
  }, [engine])

  useEffect(() => {
    engine.registry.i18n.setLanguage(language)
  }, [engine, language])

  useEffect(() => {
    engine.registry.registerDesignerIcons({
      ...builtinIcons,
      ...props.icons,
    })
  }, [engine, props.icons])

  return (
    <>
      {props.children}
      <GhostWidget />
    </>
  )
})

/**
 * 设计器根组件：注入 UI 配置、引擎上下文并挂载引擎事件。
 */
export const Designer = (props: IDesignerProps) => {
  const { engine, children, plugins, ...config } = props
  return (
    <ConfigProvider {...config}>
      <DesignerEngineContext.Provider value={engine}>
        <DesignerPluginProvider plugins={plugins}>
          <DesignerShell engine={engine} icons={config.icons}>
            {children}
          </DesignerShell>
        </DesignerPluginProvider>
      </DesignerEngineContext.Provider>
    </ConfigProvider>
  )
}

Designer.displayName = 'Designer'

export { useDesigner }
