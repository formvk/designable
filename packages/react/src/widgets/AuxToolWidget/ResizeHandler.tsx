import type { TreeNode } from '@formvk/designable-core'

import { useDesigner, usePrefix } from '../../hooks'
import { cx } from '../../utils'

export interface IResizeHandlerProps {
  node: TreeNode
}

const HANDLERS = [
  'left-top',
  'center-top',
  'right-top',
  'right-center',
  'right-bottom',
  'center-bottom',
  'left-bottom',
  'left-center',
]

/**
 * 节点缩放手柄，按节点 allowResize 的轴向渲染。
 */
export const ResizeHandler = (props: IResizeHandlerProps) => {
  const designer = useDesigner()
  const prefix = usePrefix('aux-node-resize-handler')
  const allowResize = props.node.allowResize()
  if (!allowResize) return null
  const allowX = allowResize.includes('x')
  const allowY = allowResize.includes('y')
  const allow = (value: string) => {
    if (value === 'left-center' || value === 'right-center') return allowX
    if (value === 'center-top' || value === 'center-bottom') return allowY
    return allowX && allowY
  }

  return (
    <>
      {HANDLERS.filter(allow).map(value => (
        <div
          key={value}
          role="presentation"
          className={cx(prefix, value)}
          {...{ [designer.props.nodeResizeHandlerAttrName]: value }}
        />
      ))}
    </>
  )
}

ResizeHandler.displayName = 'ResizeHandler'
