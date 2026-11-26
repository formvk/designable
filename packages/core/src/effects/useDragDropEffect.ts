import { Point } from '@formvk/designable-shared'

import { DragStartEvent, DragMoveEvent, DragStopEvent, ViewportScrollEvent } from '../events'
import { reportError } from '../internals'
import type { Engine, IDragDropContext } from '../models'
import { ClosestPosition, CursorType, CursorDragType, DESIGNER_PIPELINES, TreeNode } from '../models'

export const useDragDropEffect = (engine: Engine) => {
  // 落点处理是异步的，首个 DragStop 完成前忽略重复事件，避免同一批 dragNodes 被重复插入
  let dropping = false

  engine.subscribeTo(DragStartEvent, event => {
    if (engine.cursor.type !== CursorType.Normal) return
    const target = event.data.target as HTMLElement
    const el = target?.closest(`
       *[${engine.props.nodeIdAttrName}],
       *[${engine.props.sourceIdAttrName}],
       *[${engine.props.outlineNodeIdAttrName}]
      `)
    const handler = target?.closest(`*[${engine.props.nodeDragHandlerAttrName}]`)
    const helper = handler?.closest(`*[${engine.props.nodeSelectionIdAttrName}]`)
    if (!el?.getAttribute && !handler) return
    const props = engine.props
    const sourceId = el?.getAttribute(props.sourceIdAttrName)
    const outlineId = el?.getAttribute(props.outlineNodeIdAttrName)
    const handlerId = helper?.getAttribute(props.nodeSelectionIdAttrName)
    const nodeId = el?.getAttribute(props.nodeIdAttrName)
    engine.workbench.eachWorkspace(currentWorkspace => {
      const operation = currentWorkspace.operation
      const moveHelper = operation.moveHelper
      const id = nodeId || outlineId || handlerId
      if (id) {
        const node = engine.findNodeById(id, currentWorkspace)
        if (node) {
          if (!node.allowDrag()) return
          if (node === node.root) return
          const validSelected = engine.getAllSelectedNodes().filter(node => node.allowDrag())
          if (validSelected.some(selectNode => selectNode === node)) {
            moveHelper.dragStart({ dragNodes: TreeNode.sort(validSelected) })
          } else {
            moveHelper.dragStart({ dragNodes: [node] })
          }
        }
      } else if (sourceId) {
        const sourceNode = engine.findNodeById(sourceId, currentWorkspace)
        if (sourceNode) {
          moveHelper.dragStart({ dragNodes: [sourceNode] })
        }
      }
    })
    engine.cursor.setStyle('move')
  })

  engine.subscribeTo(DragMoveEvent, event => {
    if (engine.cursor.type !== CursorType.Normal) return
    if (engine.cursor.dragType !== CursorDragType.Move) return
    const target = event.data.target as HTMLElement
    const el = target?.closest(`
      *[${engine.props.nodeIdAttrName}],
      *[${engine.props.outlineNodeIdAttrName}]
    `)
    const point = new Point(event.data.topClientX as number, event.data.topClientY as number)
    const props = engine.props
    const nodeId = el?.getAttribute(props.nodeIdAttrName)
    const outlineId = el?.getAttribute(props.outlineNodeIdAttrName)
    engine.workbench.eachWorkspace(currentWorkspace => {
      const operation = currentWorkspace.operation
      const moveHelper = operation.moveHelper
      const dragNodes = moveHelper.dragNodes
      const tree = operation.tree
      if (!dragNodes.length) return
      const id = nodeId || outlineId
      if (!id) return
      const touchNode = tree.findById(id)
      if (!touchNode) return
      moveHelper.dragMove({
        point,
        touchNode,
      })
    })
  })

  engine.subscribeTo(ViewportScrollEvent, event => {
    if (engine.cursor.type !== CursorType.Normal) return
    if (engine.cursor.dragType !== CursorDragType.Move) return
    const point = new Point(engine.cursor.position.topClientX as number, engine.cursor.position.topClientY as number)
    const currentWorkspace = event?.context?.workspace ?? engine.workbench.activeWorkspace
    if (!currentWorkspace) return
    const operation = currentWorkspace.operation
    const moveHelper = operation.moveHelper
    if (!moveHelper.dragNodes.length) return
    const tree = operation.tree
    const viewport = currentWorkspace.viewport
    const outline = currentWorkspace.outline
    const viewportTarget = viewport.elementFromPoint(point)
    const outlineTarget = outline.elementFromPoint(point)
    const viewportNodeElement = viewportTarget?.closest(`
      *[${engine.props.nodeIdAttrName}],
      *[${engine.props.outlineNodeIdAttrName}]
    `)
    const outlineNodeElement = outlineTarget?.closest(`
    *[${engine.props.nodeIdAttrName}],
    *[${engine.props.outlineNodeIdAttrName}]
  `)
    const props = engine.props
    const nodeId = viewportNodeElement?.getAttribute(props.nodeIdAttrName)
    const outlineNodeId = outlineNodeElement?.getAttribute(props.outlineNodeIdAttrName)
    const id = nodeId || outlineNodeId
    if (!id) return
    const touchNode = tree.findById(id)
    if (!touchNode) return
    moveHelper.dragMove({ point, touchNode })
  })

  engine.subscribeTo(DragStopEvent, () => {
    if (engine.cursor.type !== CursorType.Normal) return
    if (engine.cursor.dragType !== CursorDragType.Move) return
    if (dropping) return
    dropping = true
    void (async () => {
      try {
        for (const currentWorkspace of engine.workbench.workspaces) {
          const operation = currentWorkspace.operation
          const moveHelper = operation.moveHelper
          const dragNodes = moveHelper.dragNodes
          if (!dragNodes.length) continue
          const selection = operation.selection
          const drop = async (context: IDragDropContext) => {
            const closestNode = context.node
            const closestDirection = context.direction
            if (!(context.dragNodes.length && closestNode && closestDirection)) return
            if (closestDirection === ClosestPosition.After || closestDirection === ClosestPosition.Under) {
              if (closestNode.allowSibling(context.dragNodes)) {
                const droppableNodes = await TreeNode.filterDroppable(context.dragNodes, closestNode.parent)
                selection.batchSafeSelect(await closestNode.insertAfter(...droppableNodes))
              }
            } else if (closestDirection === ClosestPosition.Before || closestDirection === ClosestPosition.Upper) {
              if (closestNode.allowSibling(context.dragNodes)) {
                const droppableNodes = await TreeNode.filterDroppable(context.dragNodes, closestNode.parent)
                selection.batchSafeSelect(await closestNode.insertBefore(...droppableNodes))
              }
            } else if (closestDirection === ClosestPosition.Inner || closestDirection === ClosestPosition.InnerAfter) {
              if (closestNode.allowAppend(context.dragNodes)) {
                const droppableNodes = await TreeNode.filterDroppable(context.dragNodes, closestNode)
                selection.batchSafeSelect(await closestNode.append(...droppableNodes))
                moveHelper.dragDrop({ dropNode: closestNode })
              }
            } else if (closestDirection === ClosestPosition.InnerBefore) {
              if (closestNode.allowAppend(context.dragNodes)) {
                const droppableNodes = await TreeNode.filterDroppable(context.dragNodes, closestNode)
                selection.batchSafeSelect(await closestNode.prepend(...droppableNodes))
                moveHelper.dragDrop({ dropNode: closestNode })
              }
            }
          }
          const context: IDragDropContext = {
            engine,
            workspace: currentWorkspace,
            dragNodes,
            node: moveHelper.closestNode,
            direction: moveHelper.closestDirection,
          }
          try {
            if (engine.pipeline) {
              await engine.pipeline.run(DESIGNER_PIPELINES.dragDrop, context, () => drop(context))
            } else {
              await drop(context)
            }
          } finally {
            moveHelper.dragEnd()
          }
        }
      } finally {
        engine.cursor.setStyle('')
      }
    })()
      .catch(reportError)
      .finally(() => {
        dropping = false
      })
  })
}
