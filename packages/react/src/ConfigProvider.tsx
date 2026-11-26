import type { IDesignerIcons, IDesignerLocales } from '@formvk/designable-core'
import type { I18n } from '@formvk/designable-i18n'
import { createI18n, mergeLocales } from '@formvk/designable-i18n'
import { each } from '@formvk/shared'
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { DesignerContext } from './context'
import { defaultLocales } from './locales'
import type { DesignerPosition, DesignerTheme, IDesignerContextValue, ResolvedTheme } from './types'
import { cx } from './utils'

export interface IConfigProviderProps {
  prefixCls?: string
  theme?: DesignerTheme
  locale?: string
  fallbackLocale?: string
  messages?: IDesignerLocales
  icons?: IDesignerIcons
  variables?: Record<string, string>
  position?: DesignerPosition
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

const warnedPrefixes = new Set<string>()

/**
 * 读取编译时 Less 前缀，用于提前暴露 prefixCls 与样式不一致的问题。
 */
const warnPrefixMismatch = (prefixCls: string) => {
  if (typeof document === 'undefined') return
  if (warnedPrefixes.has(prefixCls)) return
  const compiled = getComputedStyle(document.documentElement)
    .getPropertyValue('--dr-compiled-prefix')
    .trim()
    .replace(/^['"]|['"]$/g, '')
  if (compiled && compiled !== prefixCls) {
    warnedPrefixes.add(prefixCls)
    console.warn(
      `[@formvk/designable-react] prefixCls "${prefixCls}" 与样式编译前缀 "${compiled}" 不一致，组件样式可能缺失。` +
        `请使用默认前缀，或基于 style.less 重新声明 @dr-prefix 后自行编译。`
    )
  }
}

const useSystemTheme = (theme: DesignerTheme): ResolvedTheme => {
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    if (theme !== 'auto') return
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setSystemTheme(media.matches ? 'dark' : 'light')
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  return theme === 'auto' ? systemTheme : theme
}

const createDesignerI18n = (locale?: string, fallbackLocale?: string, messages?: IDesignerLocales): I18n => {
  const locales = mergeLocales({}, defaultLocales)
  if (messages) mergeLocales(locales, messages)
  return createI18n({
    language: locale,
    fallbackLanguage: fallbackLocale || 'en-US',
    locales,
  })
}

/**
 * 设计器 UI 配置。作为根节点时渲染全屏容器并注入主题与 CSS 变量。
 */
export const ConfigProvider = (props: IConfigProviderProps) => {
  const parent = useContext(DesignerContext)
  const prefixCls = props.prefixCls ?? parent?.prefixCls ?? 'dr'
  const position = props.position ?? parent?.position ?? 'fixed'
  const rawTheme = props.theme ?? (parent ? parent.theme : 'light')
  const resolvedTheme = useSystemTheme(props.theme ?? (parent ? parent.theme : 'light'))

  const i18n = useMemo(() => {
    if (!props.locale && !props.messages && parent) return parent.i18n
    return createDesignerI18n(props.locale ?? parent?.i18n.getLanguage(), props.fallbackLocale, props.messages)
    // 语言/文案变化通过 effect 同步，不重建实例
  }, [parent?.i18n])

  useEffect(() => {
    if (i18n === parent?.i18n) return
    if (props.locale) i18n.setLanguage(props.locale)
  }, [i18n, props.locale])

  useEffect(() => {
    if (i18n === parent?.i18n) return
    if (props.messages) i18n.registerLocales(props.messages)
  }, [i18n, props.messages])

  useEffect(() => {
    warnPrefixMismatch(prefixCls)
  }, [prefixCls])

  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const element = rootRef.current
    if (!element || !props.variables) return
    each(props.variables, (value, key) => {
      element.style.setProperty(`--${key}`, value)
    })
  }, [props.variables])

  const value = useMemo<IDesignerContextValue>(
    () => ({
      prefixCls,
      theme: resolvedTheme,
      position,
      i18n,
      icons: props.icons ?? parent?.icons,
    }),
    [prefixCls, resolvedTheme, position, i18n, props.icons, parent?.icons]
  )

  const content = <DesignerContext.Provider value={value}>{props.children}</DesignerContext.Provider>

  if (parent) return content

  return (
    <div
      ref={rootRef}
      className={cx(
        `${prefixCls}-app`,
        `${prefixCls}-app-${position}`,
        `${prefixCls}-app-${rawTheme}`,
        props.className
      )}
      data-dr-theme={resolvedTheme}
      style={props.style}
    >
      {content}
    </div>
  )
}

ConfigProvider.displayName = 'ConfigProvider'
