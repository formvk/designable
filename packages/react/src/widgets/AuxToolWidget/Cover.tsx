import { ClosestPosition, CursorStatus } from '@formvk/designable-core'
import type { TreeNode } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'
import type { CSSProperties } from 'react'

import { useCursor, useMoveHelper, usePrefix, useViewport } from '../../hooks'
import { useValidNodeOffsetRect } from '../../hooks/useValidNodeOffsetRect'
import { cx } from '../../utils'

interface ICoverRectProps {
  node: TreeNode
  dragging?: boolean
  dropping?: boolean
}

const CoverRect = (props: ICoverRectProps) => {
  const prefix = usePrefix('aux-cover-rect')
  const rect = useValidNodeOffsetRect(props.node)
  const style: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    pointerEvents: 'none',
    transform: rect ? `perspective(1px) translate3d(${rect.x}px,${rect.y}px,0)` : undefined,
    height: rect?.height,
    width: rect?.width,
  }
  return (
    <div
      className={cx(prefix, {
        [`${prefix}-dragging`]: props.dragging,
        [`${prefix}-dropping`]: props.dropping,
      })}
      style={style}
    />
  )
}

CoverRect.displayName = 'CoverRect'

/**
 * 拖拽遮罩：正在拖拽的节点置灰，可落点节点高亮。
 */
export const Cover = observer(() => {
  const moveHelper = useMoveHelper()
  const viewport = useViewport()
  const cursor = useCursor()

  if (cursor.status !== CursorStatus.Dragging || !moveHelper) return null
  const closestNode = moveHelper.closestNode
  const dropNode =
    closestNode &&
    closestNode.allowAppend(moveHelper.dragNodes) &&
    moveHelper.viewportClosestDirection === ClosestPosition.Inner
      ? closestNode
      : undefined

  return (
    <>
      {moveHelper.dragNodes.map(node => {
        if (!node || !viewport?.findElementById(node.id)) return null
        return <CoverRect key={node.id} node={node} dragging />
      })}
      {dropNode ? <CoverRect node={dropNode} dropping /> : null}
    </>
  )
})

Cover.displayName = 'Cover'
