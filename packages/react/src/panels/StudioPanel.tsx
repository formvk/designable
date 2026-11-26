import type { CSSProperties, ReactNode } from 'react'

import { usePosition, usePrefix } from '../hooks'
import { Layout } from '../Layout'
import type { DesignerPosition } from '../types'
import { cx } from '../utils'

export interface IStudioPanelProps {
  logo?: ReactNode
  actions?: ReactNode
  className?: string
  style?: CSSProperties
  prefixCls?: string
  theme?: 'light' | 'dark' | 'auto'
  position?: DesignerPosition
  children?: ReactNode
}

const StudioPanelInternal = (props: IStudioPanelProps) => {
  const { logo, actions, className, style, children } = props
  const prefix = usePrefix('main-panel')
  const position = usePosition()
  return (
    <div className={cx(`${prefix}-container`, 'root', position, className)} style={style} data-position={position}>
      {logo || actions ? (
        <div className={`${prefix}-header`}>
          <div className={`${prefix}-header-logo`}>{logo}</div>
          <div className={`${prefix}-header-actions`}>{actions}</div>
        </div>
      ) : null}
      <div className={prefix}>{children}</div>
    </div>
  )
}

/**
 * 设计器主面板。可作为独立根容器，内部自动创建配置上下文。
 */
export const StudioPanel = (props: IStudioPanelProps) => {
  return (
    <Layout theme={props.theme} prefixCls={props.prefixCls} position={props.position}>
      <StudioPanelInternal {...props} />
    </Layout>
  )
}

StudioPanel.displayName = 'StudioPanel'
