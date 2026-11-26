import { CursorDragType, CursorStatus } from '@formvk/designable-core'
import { calcRectByStartEndPoint } from '@formvk/designable-shared'
import { observer } from '@formvk/reactive-react'
import type { CSSProperties } from 'react'

import { useCursor, useMoveHelper, usePrefix, useViewport } from '../../hooks'

/**
 * 空白区域框选。
 */
export const FreeSelection = observer(() => {
  const cursor = useCursor()
  const viewport = useViewport()
  const moveHelper = useMoveHelper()
  const prefix = usePrefix('aux-free-selection')

  if (
    !viewport ||
    moveHelper?.hasDragNodes ||
    cursor.status !== CursorStatus.Dragging ||
    cursor.dragType !== CursorDragType.Move
  ) {
    return null
  }
  const { dragStartPosition, position } = cursor
  if (!dragStartPosition) return null

  const startPoint = viewport.getOffsetPoint({
    x: dragStartPosition.topClientX as number,
    y: dragStartPosition.topClientY as number,
  })
  const currentPoint = viewport.getOffsetPoint({
    x: position.topClientX as number,
    y: position.topClientY as number,
  })
  const rect = calcRectByStartEndPoint(startPoint, currentPoint, viewport.dragScrollXDelta, viewport.dragScrollYDelta)
  const style: CSSProperties = {
    top: 0,
    left: 0,
    transform: `perspective(1px) translate3d(${rect.x}px,${rect.y}px,0)`,
    height: rect.height,
    width: rect.width,
  }
  return <div className={prefix} style={style} />
})

FreeSelection.displayName = 'FreeSelection'
