import { ClosestPosition } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'
import type { CSSProperties } from 'react'

import { useMoveHelper, usePrefix } from '../../hooks'
import { cx } from '../../utils'

const forbidDirections = [
  ClosestPosition.ForbidBefore,
  ClosestPosition.ForbidAfter,
  ClosestPosition.ForbidInnerAfter,
  ClosestPosition.ForbidInnerBefore,
  ClosestPosition.ForbidUnder,
  ClosestPosition.ForbidUpper,
]

const beforeDirections = [ClosestPosition.Before, ClosestPosition.ForbidBefore]

const afterDirections = [ClosestPosition.After, ClosestPosition.ForbidAfter]

const innerAfterDirections = [
  ClosestPosition.InnerAfter,
  ClosestPosition.Under,
  ClosestPosition.ForbidInnerAfter,
  ClosestPosition.ForbidUnder,
]

const innerBeforeDirections = [
  ClosestPosition.InnerBefore,
  ClosestPosition.Upper,
  ClosestPosition.ForbidInnerBefore,
  ClosestPosition.ForbidUpper,
]

/**
 * 拖拽插入线。纵向布局显示横线，横向布局显示竖线；禁止落点时变红。
 */
export const Insertion = observer(() => {
  const moveHelper = useMoveHelper()
  const prefix = usePrefix('aux-insertion')

  const direction = moveHelper?.viewportClosestDirection
  const rect = moveHelper?.viewportClosestOffsetRect
  const isInline = moveHelper?.closestNode?.moveLayout === 'horizontal'
  const style: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    transform: 'perspective(1px) translate3d(0,0,0)',
  }
  if (!rect || !direction) return <div className={prefix} style={style} />

  if (beforeDirections.includes(direction)) {
    style.width = 2
    style.height = rect.height
    style.transform = `perspective(1px) translate3d(${rect.x}px,${rect.y}px,0)`
  } else if (afterDirections.includes(direction)) {
    style.width = 2
    style.height = rect.height
    style.transform = `perspective(1px) translate3d(${rect.x + rect.width - 2}px,${rect.y}px,0)`
  } else if (innerAfterDirections.includes(direction)) {
    if (isInline) {
      style.width = 2
      style.height = rect.height
      style.transform = `perspective(1px) translate3d(${rect.x + rect.width - 2}px,${rect.y}px,0)`
    } else {
      style.width = rect.width
      style.height = 2
      style.transform = `perspective(1px) translate3d(${rect.x}px,${rect.y + rect.height - 2}px,0)`
    }
  } else if (innerBeforeDirections.includes(direction)) {
    if (isInline) {
      style.width = 2
      style.height = rect.height
      style.transform = `perspective(1px) translate3d(${rect.x}px,${rect.y}px,0)`
    } else {
      style.width = rect.width
      style.height = 2
      style.transform = `perspective(1px) translate3d(${rect.x}px,${rect.y}px,0)`
    }
  }

  return <div className={cx(prefix, { [`${prefix}-forbid`]: forbidDirections.includes(direction) })} style={style} />
})

Insertion.displayName = 'Insertion'
