import type { TreeNode } from '@formvk/designable-core'
import { Icon } from '@formvk/designable-react-icons'
import type { CSSProperties } from 'react'

import { useDesigner, usePrefix } from '../../hooks'

export interface IDragHandlerProps {
  node: TreeNode
  style?: CSSProperties
}

/**
 * 拖拽手柄，依赖引擎的 move 事件识别该属性。
 */
export const DragHandler = (props: IDragHandlerProps) => {
  const designer = useDesigner()
  const prefix = usePrefix('aux-drag-handler')
  if (props.node === props.node.root || !props.node.allowDrag()) return null
  return (
    <button
      type="button"
      className={prefix}
      style={props.style}
      title="Move"
      {...{ [designer.props.nodeDragHandlerAttrName]: 'true' }}
    >
      <Icon name="drag-move" />
    </button>
  )
}

DragHandler.displayName = 'DragHandler'
