import type { IDesignerMiniLocales } from '@formvk/designable-core'
import { isPlainObj, isStr } from '@formvk/shared'
import type { ReactNode } from 'react'

import { useLocale, useText } from '../hooks'

export interface ITextWidgetProps {
  componentName?: string
  sourceName?: string
  token?: string | IDesignerMiniLocales
  defaultMessage?: string | IDesignerMiniLocales
  children?: ReactNode
}

/**
 * 文案组件：token 优先，其次 children；支持多语言文案对象。
 */
export const TextWidget = (props: ITextWidgetProps) => {
  const t = useText()
  const locale = useLocale()

  const takeLocale = (message: string | IDesignerMiniLocales): ReactNode => {
    if (isStr(message)) return t(message)
    if (isPlainObj(message)) {
      for (const key in message) {
        if (key.toLowerCase() === locale.toLowerCase()) return message[key]
      }
      return undefined
    }
    return message
  }

  if (props.token) return <>{takeLocale(props.token)}</>
  if (props.children) return <>{takeLocale(props.children as string | IDesignerMiniLocales)}</>
  if (props.defaultMessage) return <>{takeLocale(props.defaultMessage)}</>
  return null
}

TextWidget.displayName = 'TextWidget'
