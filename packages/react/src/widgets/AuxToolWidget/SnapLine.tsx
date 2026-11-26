import { CursorStatus } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'
import type { CSSProperties } from 'react'

import { useCursor, usePrefix, useTransformHelper } from '../../hooks'

/**
 * 拖拽吸附线。
 */
export const SnapLine = observer(() => {
  const cursor = useCursor()
  const transformHelper = useTransformHelper()
  const prefix = usePrefix('aux-snap-line')

  if (cursor.status !== CursorStatus.Dragging || !transformHelper) return null
  return (
    <>
      {transformHelper.closestSnapLines.map((line, key) => {
        if (line.type !== 'normal') return null
        const rect = line.rect
        if (!rect) return null
        const style: CSSProperties = {
          top: 0,
          left: 0,
          height: rect.height || 1,
          width: rect.width || 1,
          transform: `perspective(1px) translate3d(${rect.x}px,${rect.y}px,0)`,
        }
        return <div key={key} className={prefix} style={style} />
      })}
    </>
  )
})

SnapLine.displayName = 'SnapLine'
