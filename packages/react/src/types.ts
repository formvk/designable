import type { Engine, IBehavior, IDesignerIcons, IDesignerLocales, IResource } from '@formvk/designable-core'
import type { I18n } from '@formvk/designable-i18n'
import type { ComponentType, CSSProperties, FC, ReactNode } from 'react'

import type { IDesignerPlugin } from './plugins/types'

export type DesignerTheme = 'light' | 'dark' | 'auto'

export type ResolvedTheme = 'light' | 'dark'

export type DesignerPosition = 'fixed' | 'absolute' | 'relative'

export interface IDesignerLayoutProps {
  /** 类名前缀，默认 dr，需与 Less 变量 @dr-prefix 保持一致 */
  prefixCls?: string
  theme?: DesignerTheme
  /** 设计器全局 CSS 变量 */
  variables?: Record<string, string>
  position?: DesignerPosition
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export interface IDesignerProps extends IDesignerLayoutProps {
  engine: Engine
  /** 设计器 UI 语言，如 zh-CN / en-US */
  locale?: string
  fallbackLocale?: string
  /** 追加的 UI 文案 */
  messages?: IDesignerLocales
  /** 追加的图标映射 */
  icons?: IDesignerIcons
  /** 设计器插件，需保持引用稳定 */
  plugins?: IDesignerPlugin[]
}

export interface IDesignerContextValue {
  prefixCls: string
  theme: ResolvedTheme
  position: DesignerPosition
  i18n: I18n
  icons?: IDesignerIcons
}

export type DnFC<P = {}> = FC<P> & {
  Resource?: IResource[]
  Behavior?: IBehavior[]
}

export type DnComponent<P = {}> = ComponentType<P> & {
  Resource?: IResource[]
  Behavior?: IBehavior[]
}

export interface IDesignerComponents {
  [key: string]: DnFC<any> | DnComponent<any>
}
