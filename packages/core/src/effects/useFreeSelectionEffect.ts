import type { Rect } from '@formvk/designable-shared'
import { calcRectByStartEndPoint, isCrossRectInRect, isRectInRect, Point } from '@formvk/designable-shared'

import { DragStopEvent } from '../events'
import type { Engine, TreeNode } from '../models'
import { CursorType, CursorDragType } from '../models'

export const useFreeSelectionEffect = (engine: Engine) => {
  engine.subscribeTo(DragStopEvent, event => {
    if (engine.cursor.dragType !== CursorDragType.Move) {
      return
    }
    engine.workbench.eachWorkspace(workspace => {
      // 拖拽节点时选中由落点逻辑接管，不能再用起止矩形框选，
      // 否则会把拖拽沿途覆盖到的节点一并选中
      if (workspace.operation.moveHelper.hasDragNodes) return
      const viewport = workspace.viewport
      const dragEndPoint = new Point(event.data.topClientX, event.data.topClientY)
      const dragStartOffsetPoint = viewport.getOffsetPoint(
        new Point(engine.cursor.dragStartPosition?.topClientX, engine.cursor.dragStartPosition?.topClientY)
      )
      const dragEndOffsetPoint = viewport.getOffsetPoint(
        new Point(engine.cursor.position.topClientX, engine.cursor.position.topClientY)
      )
      if (!viewport.isPointInViewport(dragEndPoint, false)) return
      const tree = workspace.operation.tree
      const selectionRect = calcRectByStartEndPoint(
        dragStartOffsetPoint,
        dragEndOffsetPoint,
        viewport.dragScrollXDelta,
        viewport.dragScrollYDelta
      )
      const selected: [TreeNode, Rect][] = []
      tree.eachChildren(node => {
        const nodeRect = viewport.getValidNodeOffsetRect(node)
        if (nodeRect && isCrossRectInRect(selectionRect, nodeRect)) {
          selected.push([node, nodeRect])
        }
      })
      const selectedNodes = selected.reduce<TreeNode[]>((buf, [node, nodeRect]) => {
        if (isRectInRect(nodeRect, selectionRect)) {
          if (selected.some(([selectNode]) => selectNode.isMyParents(node))) {
            return buf
          }
        }
        return buf.concat(node)
      }, [])
      workspace.operation.selection.batchSafeSelect(selectedNodes)
    })
    if (engine.cursor.type === CursorType.Selection) {
      engine.cursor.setType(CursorType.Normal)
    }
  })
}
