import { CursorStatus } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'

import { useDesigner, usePrefix } from '../hooks'
import { cx } from '../utils'
import { NodeTitleWidget } from './NodeTitleWidget'

/**
 * 拖拽跟随幽灵节点。
 */
export const GhostWidget = observer(() => {
  const designer = useDesigner()
  const prefix = usePrefix('ghost')

  const nodes = designer.findMovingNodes()
  const state = {
    first: nodes[0],
    count: nodes.length,
    dragging: designer.cursor.status === CursorStatus.Dragging,
    position: designer.cursor.position,
  }

  if (!state.first || !state.dragging || !state.position) return null

  const { topClientX = 0, topClientY = 0 } = state.position

  return (
    <div
      className={cx(prefix)}
      style={{
        transform: `translate3d(${topClientX - 16}px, ${topClientY - 12}px, 0) scale(0.85)`,
      }}
    >
      <NodeTitleWidget node={state.first} />
      {state.count > 1 ? '…' : null}
    </div>
  )
})

GhostWidget.displayName = 'GhostWidget'
