import type { TreeNode } from '@formvk/designable-core'
import { Icon } from '@formvk/designable-react-icons'
import type { CSSProperties } from 'react'

import { useDesigner, usePrefix } from '../../hooks'

export interface ITranslateHandlerProps {
  node: TreeNode
  style?: CSSProperties
}

const iconStyle: CSSProperties = { width: 12, height: 12, color: '#fff' }

/**
 * 自由移动手柄：按下后节点脱离布局流，可任意拖拽位置。
 */
export const TranslateHandler = (props: ITranslateHandlerProps) => {
  const designer = useDesigner()
  const prefix = usePrefix('aux-node-translate-handler')
  if (!props.node.allowTranslate()) return null
  return (
    <div
      role="presentation"
      className={prefix}
      style={props.style}
      {...{ [designer.props.nodeTranslateAttrName]: 'translate' }}
    >
      <Icon name="drag-move" style={iconStyle} />
    </div>
  )
}

TranslateHandler.displayName = 'TranslateHandler'
