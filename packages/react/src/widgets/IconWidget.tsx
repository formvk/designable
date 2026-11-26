import type { IconName } from '@formvk/designable-react-icons'
import { icons as builtinIcons } from '@formvk/designable-react-icons'
import { observer } from '@formvk/reactive-react'
import { isFn, isPlainObj, isStr } from '@formvk/shared'
import { cloneElement, createElement, isValidElement, useEffect, useRef } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

import { usePrefix, useRegistry, useText, useTheme } from '../hooks'
import { cx } from '../utils'

export interface IIconWidgetProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  infer?: string | ReactNode | { shadow?: string; light?: string; dark?: string } | null
  size?: number | string
  tooltip?: ReactNode | boolean
}

const ShadowSVG = (props: { content?: string; width: number | string; height: number | string }) => {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current) return
    const root = ref.current.attachShadow({ mode: 'open' })
    root.innerHTML = `<svg viewBox="0 0 1024 1024" style="width:${props.width};height:${props.height}">${props.content}</svg>`
  }, [props.content, props.width, props.height])
  return <div ref={ref} />
}

const isImageSource = (value: string) =>
  /^data:image\//.test(value) || /^https?:\/\//.test(value) || /\.(png|jpe?g|gif|svg|webp)(\?.*)?$/i.test(value)

const renderIcon = (
  infer: IIconWidgetProps['infer'],
  options: { width: number | string; height: number | string; theme: string; registry: ReturnType<typeof useRegistry> }
): ReactNode => {
  const { width, height, theme, registry } = options
  if (!infer) return null
  if (isStr(infer)) {
    const builtin = builtinIcons[infer as IconName]
    if (builtin) return createElement(builtin, { width, height })
    const registered = registry.getDesignerIcon(infer)
    if (registered) return renderIcon(registered as IIconWidgetProps['infer'], options)
    if (isImageSource(infer)) return <img src={infer} width={width} height={height} alt="" />
    return null
  }
  if (isFn(infer)) {
    return createElement(infer as (props: Record<string, unknown>) => ReactNode, {
      width,
      height,
      fill: 'currentColor',
    })
  }
  if (isValidElement(infer)) {
    const element = infer as React.ReactElement<Record<string, unknown>>
    if (element.type === 'svg') {
      return cloneElement(element, {
        width,
        height,
        fill: 'currentColor',
        viewBox: element.props.viewBox || '0 0 1024 1024',
      })
    }
    if (element.type === 'path' || element.type === 'g') {
      return (
        <svg viewBox="0 0 1024 1024" width={width} height={height} fill="currentColor">
          {element}
        </svg>
      )
    }
    return element
  }
  if (isPlainObj(infer)) {
    const iconMap = infer as Record<string, string>
    if (iconMap[theme]) return renderIcon(iconMap[theme], options)
    if (iconMap.shadow) return <ShadowSVG content={iconMap.shadow} width={width} height={height} />
    return null
  }
  return null
}

/**
 * 统一图标渲染：内置图标名、注册表图标、URL、ReactNode、阴影图标均可。
 */
export const IconWidget = observer((props: IIconWidgetProps) => {
  const { infer, size = '1em', tooltip, className, style, title, ...rest } = props
  const prefix = usePrefix('icon')
  const registry = useRegistry()
  const theme = useTheme()
  const t = useText()
  const width = style?.width ?? size
  const height = style?.height ?? size

  const rendered = renderIcon(infer, { width, height, theme, registry })

  if (!infer) return null

  const tooltipTitle =
    tooltip === false ? undefined : isStr(tooltip) ? tooltip : isStr(infer) ? t(`icons.${infer}`, infer) : undefined

  const content = (
    <span
      {...rest}
      title={tooltip === false ? title : (tooltipTitle ?? title)}
      className={cx(prefix, className)}
      style={{
        ...style,
        cursor: props.onClick ? 'pointer' : style?.cursor,
      }}
    >
      {rendered}
    </span>
  )

  return content
})

IconWidget.displayName = 'IconWidget'
