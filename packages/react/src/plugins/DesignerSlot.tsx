import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

import { useDesignerSlotRegistry } from './DesignerPluginProvider'

const EMPTY: never[] = []

const noopSubscribe = (_onStoreChange: () => void) => () => {}

export interface IDesignerSlotProps<P extends object = Record<string, never>> {
  name: string
  props?: P
  fallback?: ReactNode
}

/**
 * 命名槽位：按 order 渲染已注册的插件组件，无条目时渲染 fallback。
 */
export const DesignerSlot = <P extends object = Record<string, never>>(props: IDesignerSlotProps<P>) => {
  const registry = useDesignerSlotRegistry()
  const entries = useSyncExternalStore(
    registry ? registry.subscribe : noopSubscribe,
    () => (registry ? registry.get(props.name) : EMPTY),
    () => (registry ? registry.get(props.name) : EMPTY)
  )

  if (!entries.length) return <>{props.fallback}</>

  return (
    <>
      {entries.map(entry => {
        const Component = entry.component
        return <Component key={entry.id} {...(props.props ?? ({} as P))} />
      })}
    </>
  )
}

DesignerSlot.displayName = 'DesignerSlot'
