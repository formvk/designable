import { createContext, useContext, useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { useDesigner } from '../hooks'
import { createSlotRegistry } from './SlotRegistry'
import type { IDesignerPipeline, IDesignerPlugin, IDesignerSlotEntry, IDesignerSlotRegistry } from './types'

const DesignerPluginContext = createContext<IDesignerSlotRegistry | null>(null)

export const useDesignerSlotRegistry = () => useContext(DesignerPluginContext)

export interface IDesignerPluginProviderProps {
  plugins?: IDesignerPlugin[]
  children?: ReactNode
}

/**
 * 插件宿主：创建命名槽位注册表，按插件顺序执行 setup 并托管释放。
 *
 * `plugins` 需保持引用稳定（模块级常量或 useMemo）。
 */
export const DesignerPluginProvider = (props: IDesignerPluginProviderProps) => {
  const engine = useDesigner()
  const [registry] = useState(createSlotRegistry)

  useLayoutEffect(() => {
    const disposers: Array<() => void> = []
    const slots: IDesignerSlotRegistry = {
      subscribe: registry.subscribe,
      get: registry.get,
      register<P extends object>(name: string, entry: IDesignerSlotEntry<P>) {
        const dispose = registry.register(name, entry)
        disposers.push(dispose)
        return dispose
      },
    }
    const pipeline: IDesignerPipeline = {
      use(name, middleware, options) {
        const dispose = engine.pipeline.use(name, middleware, options)
        disposers.push(dispose)
        return dispose
      },
      run(name, context, terminal) {
        return engine.pipeline.run(name, context, terminal)
      },
      has(name) {
        return engine.pipeline.has(name)
      },
    }
    const cleanups = (props.plugins ?? []).map(plugin => plugin.setup({ engine, slots, pipeline }))
    return () => {
      cleanups.forEach(cleanup => {
        if (typeof cleanup === 'function') cleanup()
      })
      disposers.forEach(dispose => dispose())
    }
  }, [engine, registry, props.plugins])

  return <DesignerPluginContext.Provider value={registry}>{props.children}</DesignerPluginContext.Provider>
}

DesignerPluginProvider.displayName = 'DesignerPluginProvider'
