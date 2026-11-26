import { ClosestPosition } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'
import type { CSSProperties } from 'react'

import { useMoveHelper, usePrefix } from '../../hooks'
import { cx } from '../../utils'

export interface IOutlineInsertionProps {
  workspaceId?: string
}

/**
 * 大纲树插入线，使用 outline 视口的最近落点信息。
 */
export const OutlineInsertion = observer((props: IOutlineInsertionProps) => {
  const moveHelper = useMoveHelper(props.workspaceId)
  const prefix = usePrefix('outline-tree-insertion')

  if (!moveHelper?.closestNode) return null
  const direction = moveHelper.outlineClosestDirection
  const rect = moveHelper.outlineClosestOffsetRect
  const style: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: 'perspective(1px) translate3d(0,0,0)',
  }
  if (rect) {
    const after =
      direction === ClosestPosition.After ||
      direction === ClosestPosition.InnerAfter ||
      direction === ClosestPosition.Under ||
      direction === ClosestPosition.ForbidAfter ||
      direction === ClosestPosition.ForbidInnerAfter ||
      direction === ClosestPosition.ForbidUnder
    const before =
      direction === ClosestPosition.Before ||
      direction === ClosestPosition.InnerBefore ||
      direction === ClosestPosition.Upper ||
      direction === ClosestPosition.ForbidBefore ||
      direction === ClosestPosition.ForbidInnerBefore ||
      direction === ClosestPosition.ForbidUpper
    if (after || before) {
      style.width = rect.width
      style.height = 2
      style.transform = `perspective(1px) translate3d(${rect.x}px,${after ? rect.y + rect.height - 2 : rect.y}px,0)`
    }
  }
  return (
    <div
      className={cx(prefix, {
        [`${prefix}-forbid`]: direction?.includes('FORBID'),
      })}
      style={style}
    />
  )
})

OutlineInsertion.displayName = 'OutlineInsertion'
