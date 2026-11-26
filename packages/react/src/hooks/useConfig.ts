import { useObserver } from '@formvk/reactive-react'
import { useContext } from 'react'

import { DesignerContext, DesignerComponentsContext, TreeNodeContext } from '../context'
import type { IDesignerContextValue } from '../types'
import { useDesigner } from './useDesigner'

/**
 * 获取 UI 配置（前缀、主题、i18n）。必须在 ConfigProvider / Designer 内部使用。
 */
export const useDesignerContext = (): IDesignerContextValue => {
  const context = useContext(DesignerContext)
  if (!context) {
    throw new Error('Designer UI context is missing, please wrap your tree with <ConfigProvider /> or <Designer />')
  }
  return context
}

export const usePrefix = (after = ''): string => {
  const { prefixCls } = useDesignerContext()
  return after ? `${prefixCls}-${after}` : prefixCls
}

export const useTheme = () => useDesignerContext().theme

export const usePosition = () => useDesignerContext().position

export const useI18n = () => useDesignerContext().i18n

export const useLocale = () => {
  const i18n = useI18n()
  return useObserver(() => i18n.getLanguage())
}

/**
 * 获取翻译函数，语言切换时组件会自动重渲染。
 */
export const useText = () => {
  const i18n = useI18n()
  return useObserver(() => {
    i18n.getLanguage()
    return (token: string, defaultMessage?: string) => i18n.t(token, undefined, defaultMessage)
  })
}

export const useComponents = () => useContext(DesignerComponentsContext)

export const useTreeNode = () => useContext(TreeNodeContext)

export const useNodeIdProps = (node?: { id: string }) => {
  const designer = useDesigner()
  const target = useTreeNode()
  return {
    [designer.props.nodeIdAttrName]: node ? node.id : target?.id,
  }
}
