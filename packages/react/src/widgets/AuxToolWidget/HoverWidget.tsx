import { observer } from '@formvk/reactive-react'
import type { CSSProperties } from 'react'

import { useHover, usePrefix, useSelection } from '../../hooks'
import { useValidNodeOffsetRect } from '../../hooks/useValidNodeOffsetRect'

/**
 * 悬停虚线框。已选中的节点不再显示。
 */
export const HoverWidget = observer(() => {
  const hover = useHover()
  const selection = useSelection()
  const prefix = usePrefix('aux-dashed-box')
  const node = hover?.node
  const rect = useValidNodeOffsetRect(node)

  if (!node || node.hidden || node.depth === 0) return null
  if (selection?.selected.includes(node.id)) return null

  const style: CSSProperties = {
    top: 0,
    left: 0,
    visibility: rect ? 'visible' : 'hidden',
    transform: rect ? `perspective(1px) translate3d(${rect.x}px,${rect.y}px,0)` : undefined,
    height: rect?.height,
    width: rect?.width,
  }

  return (
    <div className={prefix} style={style}>
      <span className={`${prefix}-title`}>{node.getMessage('title') || node.componentName}</span>
    </div>
  )
})

HoverWidget.displayName = 'HoverWidget'
