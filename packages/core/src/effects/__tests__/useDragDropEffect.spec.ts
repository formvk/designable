import { Point } from '@formvk/designable-shared'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DragMoveEvent } from '../../events/cursor/DragMoveEvent'
import { DragStartEvent } from '../../events/cursor/DragStartEvent'
import { DragStopEvent } from '../../events/cursor/DragStopEvent'
import { ViewportScrollEvent } from '../../events/viewport/ViewportScrollEvent'
import { CursorDragType, CursorType } from '../../models/Cursor'
import { ClosestPosition } from '../../models/MoveHelper'
import { DESIGNER_PIPELINES } from '../../models/Pipeline'
import { useDragDropEffect } from '../useDragDropEffect'

const createNode = (overrides: any = {}) => {
  const node: any = {
    id: 'node',
    depth: 1,
    index: 0,
    componentName: 'Input',
    parent: undefined,
    root: { id: 'root' },
    allowDrag: () => true,
    allowDrop: () => true,
    allowSibling: () => true,
    allowAppend: () => true,
    insertAfter: vi.fn(() => ['after']),
    insertBefore: vi.fn(() => ['before']),
    append: vi.fn(() => ['append']),
    prepend: vi.fn(() => ['prepend']),
    ...overrides,
  }
  return node
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

const createElement = (attrs: Record<string, string>) => {
  const element = document.createElement('div')
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value))
  const child = document.createElement('span')
  element.appendChild(child)
  document.body.appendChild(element)
  return child
}

const createHarness = () => {
  const moveHelper: any = {
    dragNodes: [],
    closestNode: undefined,
    closestDirection: undefined,
    dragStart: vi.fn(),
    dragMove: vi.fn(),
    dragEnd: vi.fn(),
    dragDrop: vi.fn(),
  }
  const tree = { findById: vi.fn() }
  const selection = { batchSafeSelect: vi.fn() }
  const workspace: any = {
    operation: { moveHelper, tree, selection },
    viewport: { elementFromPoint: vi.fn() },
    outline: { elementFromPoint: vi.fn() },
  }
  const handlers = new Map<any, (event: any) => void>()
  const engine: any = {
    props: {
      nodeIdAttrName: 'data-node-id',
      sourceIdAttrName: 'data-source-id',
      outlineNodeIdAttrName: 'data-outline-node-id',
      nodeDragHandlerAttrName: 'data-node-drag-handler',
      nodeSelectionIdAttrName: 'data-node-selection-id',
    },
    cursor: {
      type: CursorType.Normal,
      dragType: CursorDragType.Move,
      position: { topClientX: 12, topClientY: 24 },
      setStyle: vi.fn(),
    },
    workbench: {
      workspaces: [workspace],
      eachWorkspace: vi.fn((visitor: (workspace: any) => void) => visitor(workspace)),
      activeWorkspace: workspace,
    },
    findNodeById: vi.fn(),
    getAllSelectedNodes: vi.fn(() => []),
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      handlers.set(type, handler)
    }),
  }
  useDragDropEffect(engine)
  const getHandler = (type: any) => handlers.get(type) as (event: any) => void
  return { engine, workspace, moveHelper, tree, selection, getHandler }
}

const dragStartEvent = (target: EventTarget) =>
  new DragStartEvent({ target, clientX: 0, clientY: 0, pageX: 0, pageY: 0 })

const dragMoveEvent = (target: EventTarget, clientX = 100, clientY = 200) =>
  new DragMoveEvent({ target, clientX, clientY, pageX: clientX, pageY: clientY })

const viewportScrollEvent = () =>
  new ViewportScrollEvent({
    scrollX: 0,
    scrollY: 0,
    width: 0,
    height: 0,
    innerWidth: 0,
    innerHeight: 0,
    view: window,
    target: window,
  })

describe('useDragDropEffect DragStart', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('光标非普通态时忽略拖拽开始', () => {
    const { engine, getHandler } = createHarness()
    engine.cursor.type = CursorType.Selection

    getHandler(DragStartEvent)(dragStartEvent(createElement({ 'data-node-id': 'node-1' })))

    expect(engine.findNodeById).not.toHaveBeenCalled()
    expect(engine.cursor.setStyle).not.toHaveBeenCalled()
  })

  it('命中未选中的节点时仅拖拽该节点', () => {
    const { engine, moveHelper, getHandler } = createHarness()
    const node = createNode({ id: 'node-1' })
    engine.findNodeById.mockReturnValue(node)

    getHandler(DragStartEvent)(dragStartEvent(createElement({ 'data-node-id': 'node-1' })))

    expect(engine.findNodeById).toHaveBeenCalledWith('node-1', expect.any(Object))
    expect(moveHelper.dragStart).toHaveBeenCalledWith({ dragNodes: [node] })
    expect(engine.cursor.setStyle).toHaveBeenCalledWith('move')
  })

  it('命中已选中的节点时拖拽全部可选中节点并按层级排序', () => {
    const { engine, moveHelper, getHandler } = createHarness()
    const node = createNode({ id: 'node-1', depth: 2, index: 2 })
    const sibling = createNode({ id: 'node-2', depth: 2, index: 1 })
    const invalid = createNode({ id: 'node-3', allowDrag: () => false })
    engine.findNodeById.mockReturnValue(node)
    engine.getAllSelectedNodes.mockReturnValue([node, sibling, invalid])

    getHandler(DragStartEvent)(dragStartEvent(createElement({ 'data-node-id': 'node-1' })))

    expect(moveHelper.dragStart).toHaveBeenCalledWith({ dragNodes: [sibling, node] })
  })

  it('节点不可拖拽或为根节点时跳过', () => {
    const { engine, moveHelper, getHandler } = createHarness()
    const forbidden = createNode({ id: 'node-1', allowDrag: () => false })
    engine.findNodeById.mockReturnValue(forbidden)
    const handler = getHandler(DragStartEvent)

    handler(dragStartEvent(createElement({ 'data-node-id': 'node-1' })))
    const root = createNode({ id: 'node-2' })
    root.root = root
    engine.findNodeById.mockReturnValue(root)
    handler(dragStartEvent(createElement({ 'data-node-id': 'node-2' })))

    expect(moveHelper.dragStart).not.toHaveBeenCalled()
    expect(engine.cursor.setStyle).toHaveBeenCalledWith('move')
  })

  it('通过 outline 节点 id 或拖拽手柄选择节点', () => {
    const { engine, moveHelper, getHandler } = createHarness()
    const outlineNode = createNode({ id: 'outline-1' })
    engine.findNodeById.mockReturnValue(outlineNode)
    const handler = getHandler(DragStartEvent)

    handler(dragStartEvent(createElement({ 'data-outline-node-id': 'outline-1' })))
    expect(moveHelper.dragStart).toHaveBeenCalledWith({ dragNodes: [outlineNode] })

    moveHelper.dragStart.mockClear()
    const handled = createNode({ id: 'handler-1' })
    engine.findNodeById.mockReturnValue(handled)
    const handlerElement = document.createElement('div')
    handlerElement.setAttribute('data-node-drag-handler', 'true')
    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-node-selection-id', 'handler-1')
    wrapper.appendChild(handlerElement)
    document.body.appendChild(wrapper)

    handler(dragStartEvent(handlerElement))
    expect(engine.findNodeById).toHaveBeenCalledWith('handler-1', expect.any(Object))
    expect(moveHelper.dragStart).toHaveBeenCalledWith({ dragNodes: [handled] })
  })

  it('通过 sourceId 拖拽资源节点', () => {
    const { engine, moveHelper, getHandler } = createHarness()
    const sourceNode = createNode({ id: 'source-1' })
    engine.findNodeById.mockReturnValue(sourceNode)

    getHandler(DragStartEvent)(dragStartEvent(createElement({ 'data-source-id': 'source-1' })))

    expect(engine.findNodeById).toHaveBeenCalledWith('source-1', expect.any(Object))
    expect(moveHelper.dragStart).toHaveBeenCalledWith({ dragNodes: [sourceNode] })
  })

  it('未命中任何节点信息时不处理', () => {
    const { engine, moveHelper, getHandler } = createHarness()
    const handler = getHandler(DragStartEvent)

    handler(dragStartEvent(createElement({})))
    expect(engine.findNodeById).not.toHaveBeenCalled()

    engine.findNodeById.mockReturnValue(undefined)
    handler(dragStartEvent(createElement({ 'data-node-id': 'missing' })))
    expect(moveHelper.dragStart).not.toHaveBeenCalled()
    expect(engine.cursor.setStyle).toHaveBeenCalledWith('move')
  })
})

describe('useDragDropEffect DragMove', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('光标状态或拖拽类型不匹配时忽略', () => {
    const { engine, moveHelper, getHandler } = createHarness()
    moveHelper.dragNodes = [createNode()]
    engine.cursor.type = CursorType.Selection
    const handler = getHandler(DragMoveEvent)

    handler(dragMoveEvent(createElement({ 'data-node-id': 'node-1' })))
    engine.cursor.type = CursorType.Normal
    engine.cursor.dragType = CursorDragType.Resize
    handler(dragMoveEvent(createElement({ 'data-node-id': 'node-1' })))

    expect(moveHelper.dragMove).not.toHaveBeenCalled()
  })

  it('没有拖拽节点或未命中节点时不处理', () => {
    const { tree, moveHelper, getHandler } = createHarness()
    const handler = getHandler(DragMoveEvent)

    handler(dragMoveEvent(createElement({ 'data-node-id': 'node-1' })))
    expect(tree.findById).not.toHaveBeenCalled()

    moveHelper.dragNodes = [createNode()]
    handler(dragMoveEvent(createElement({})))
    expect(tree.findById).not.toHaveBeenCalled()

    tree.findById.mockReturnValue(undefined)
    handler(dragMoveEvent(createElement({ 'data-node-id': 'node-1' })))
    expect(moveHelper.dragMove).not.toHaveBeenCalled()
  })

  it('按节点 id 或 outline id 触发拖拽移动', () => {
    const { tree, moveHelper, getHandler } = createHarness()
    const node = createNode({ id: 'node-1' })
    moveHelper.dragNodes = [createNode()]
    tree.findById.mockReturnValue(node)
    const handler = getHandler(DragMoveEvent)

    handler(dragMoveEvent(createElement({ 'data-node-id': 'node-1' }), 100, 200))
    expect(moveHelper.dragMove).toHaveBeenCalledWith({ point: new Point(100, 200), touchNode: node })

    moveHelper.dragMove.mockClear()
    handler(dragMoveEvent(createElement({ 'data-outline-node-id': 'node-1' }), 30, 40))
    expect(moveHelper.dragMove).toHaveBeenCalledWith({ point: new Point(30, 40), touchNode: node })
  })
})

describe('useDragDropEffect ViewportScroll', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('光标状态或拖拽类型不匹配时忽略', () => {
    const { engine, workspace, moveHelper, getHandler } = createHarness()
    moveHelper.dragNodes = [createNode()]
    engine.cursor.type = CursorType.Sketch
    const handler = getHandler(ViewportScrollEvent)

    handler(viewportScrollEvent())
    engine.cursor.type = CursorType.Normal
    engine.cursor.dragType = CursorDragType.Resize
    handler(viewportScrollEvent())

    expect(workspace.viewport.elementFromPoint).not.toHaveBeenCalled()
  })

  it('无工作区或无拖拽节点时不处理', () => {
    const { engine, workspace, moveHelper, getHandler } = createHarness()
    const handler = getHandler(ViewportScrollEvent)

    engine.workbench.activeWorkspace = undefined
    handler(viewportScrollEvent())
    expect(workspace.viewport.elementFromPoint).not.toHaveBeenCalled()

    engine.workbench.activeWorkspace = workspace
    handler(viewportScrollEvent())
    expect(workspace.viewport.elementFromPoint).not.toHaveBeenCalled()

    moveHelper.dragNodes = [createNode()]
    workspace.viewport.elementFromPoint.mockReturnValue(null)
    workspace.outline.elementFromPoint.mockReturnValue(null)
    handler(viewportScrollEvent())
    expect(workspace.viewport.elementFromPoint).toHaveBeenCalledWith(new Point(12, 24))
    expect(moveHelper.dragMove).not.toHaveBeenCalled()
  })

  it('根据视口与大纲的元素位置触发拖拽移动', () => {
    const { workspace, tree, moveHelper, getHandler } = createHarness()
    const node = createNode({ id: 'node-1' })
    moveHelper.dragNodes = [createNode()]
    tree.findById.mockReturnValue(node)
    workspace.viewport.elementFromPoint.mockReturnValue(createElement({ 'data-node-id': 'node-1' }).parentElement)
    const handler = getHandler(ViewportScrollEvent)

    handler(viewportScrollEvent())
    expect(moveHelper.dragMove).toHaveBeenCalledWith({ point: new Point(12, 24), touchNode: node })

    moveHelper.dragMove.mockClear()
    workspace.viewport.elementFromPoint.mockReturnValue(null)
    workspace.outline.elementFromPoint.mockReturnValue(
      createElement({ 'data-outline-node-id': 'node-1' }).parentElement
    )
    handler(viewportScrollEvent())
    expect(moveHelper.dragMove).toHaveBeenCalledWith({ point: new Point(12, 24), touchNode: node })
  })

  it('上下文工作区优先于当前激活工作区', () => {
    const { engine, workspace, tree, getHandler } = createHarness()
    const contextMoveHelper: any = { dragNodes: [createNode()], dragMove: vi.fn() }
    const contextWorkspace: any = {
      operation: { moveHelper: contextMoveHelper, tree: { findById: vi.fn() } },
      viewport: {
        elementFromPoint: vi.fn(() => createElement({ 'data-node-id': 'node-2' }).parentElement),
      },
      outline: { elementFromPoint: vi.fn() },
    }
    const node = createNode({ id: 'node-2' })
    contextWorkspace.operation.tree.findById.mockReturnValue(node)
    const event = viewportScrollEvent()
    ;(event as any).context = { workspace: contextWorkspace }

    getHandler(ViewportScrollEvent)(event)

    expect(engine.workbench.eachWorkspace).toBeDefined()
    expect(workspace.viewport.elementFromPoint).not.toHaveBeenCalled()
    expect(contextMoveHelper.dragMove).toHaveBeenCalledWith({ point: new Point(12, 24), touchNode: node })
    expect(tree.findById).not.toHaveBeenCalled()
  })
})

describe('useDragDropEffect DragStop', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('光标状态或拖拽类型不匹配时忽略', () => {
    const { engine, moveHelper, getHandler } = createHarness()
    moveHelper.dragNodes = [createNode()]
    moveHelper.dragEnd = vi.fn()
    engine.cursor.type = CursorType.Selection
    const handler = getHandler(DragStopEvent)

    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    engine.cursor.type = CursorType.Normal
    engine.cursor.dragType = CursorDragType.Resize
    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))

    expect(moveHelper.dragEnd).not.toHaveBeenCalled()
    expect(engine.cursor.setStyle).not.toHaveBeenCalled()
  })

  it('没有拖拽节点时仅重置光标样式', () => {
    const { engine, moveHelper, getHandler } = createHarness()

    getHandler(DragStopEvent)(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))

    expect(moveHelper.dragEnd).not.toHaveBeenCalled()
    expect(engine.cursor.setStyle).toHaveBeenCalledWith('')
  })

  it('After/Under 方向允许同级插入时过滤不可放置节点', async () => {
    const { moveHelper, selection, getHandler } = createHarness()
    const parent = createNode({ id: 'parent' })
    const closestNode = createNode({ id: 'closest', parent })
    const droppable = createNode({ id: 'droppable' })
    const forbidden = createNode({ id: 'forbidden', allowDrop: () => false })
    moveHelper.dragNodes = [droppable, forbidden]
    moveHelper.closestNode = closestNode
    const handler = getHandler(DragStopEvent)

    moveHelper.closestDirection = ClosestPosition.After
    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()
    expect(closestNode.insertAfter).toHaveBeenCalledWith(droppable)
    expect(selection.batchSafeSelect).toHaveBeenCalledWith(['after'])

    moveHelper.closestDirection = ClosestPosition.Under
    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()
    expect(closestNode.insertAfter).toHaveBeenCalledTimes(2)
    expect(moveHelper.dragEnd).toHaveBeenCalledTimes(2)
  })

  it('After 方向不允许同级插入时跳过选择', async () => {
    const { moveHelper, selection, getHandler } = createHarness()
    const closestNode = createNode({ id: 'closest', allowSibling: () => false })
    moveHelper.dragNodes = [createNode()]
    moveHelper.closestNode = closestNode
    moveHelper.closestDirection = ClosestPosition.After

    getHandler(DragStopEvent)(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()

    expect(closestNode.insertAfter).not.toHaveBeenCalled()
    expect(selection.batchSafeSelect).not.toHaveBeenCalled()
    expect(moveHelper.dragEnd).toHaveBeenCalled()
  })

  it('Before/Upper 方向插入到前面', async () => {
    const { moveHelper, selection, getHandler } = createHarness()
    const closestNode = createNode({ id: 'closest' })
    const dragNode = createNode({ id: 'drag' })
    moveHelper.dragNodes = [dragNode]
    moveHelper.closestNode = closestNode
    const handler = getHandler(DragStopEvent)

    moveHelper.closestDirection = ClosestPosition.Before
    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()
    expect(closestNode.insertBefore).toHaveBeenCalledWith(dragNode)

    moveHelper.closestDirection = ClosestPosition.Upper
    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()
    expect(closestNode.insertBefore).toHaveBeenCalledTimes(2)
    expect(selection.batchSafeSelect).toHaveBeenCalledWith(['before'])
  })

  it('Inner/InnerAfter 方向追加子节点并派发拖放事件', async () => {
    const { moveHelper, selection, getHandler } = createHarness()
    const closestNode = createNode({ id: 'closest' })
    const dragNode = createNode({ id: 'drag' })
    moveHelper.dragNodes = [dragNode]
    moveHelper.closestNode = closestNode
    const handler = getHandler(DragStopEvent)

    moveHelper.closestDirection = ClosestPosition.Inner
    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()
    expect(closestNode.append).toHaveBeenCalledWith(dragNode)
    expect(selection.batchSafeSelect).toHaveBeenCalledWith(['append'])
    expect(moveHelper.dragDrop).toHaveBeenCalledWith({ dropNode: closestNode })

    moveHelper.closestDirection = ClosestPosition.InnerAfter
    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()
    expect(closestNode.append).toHaveBeenCalledTimes(2)
    expect(moveHelper.dragDrop).toHaveBeenCalledTimes(2)
    expect(moveHelper.dragEnd).toHaveBeenCalledTimes(2)
  })

  it('InnerBefore 方向插入到最前面', async () => {
    const { moveHelper, selection, getHandler } = createHarness()
    const closestNode = createNode({ id: 'closest' })
    moveHelper.dragNodes = [createNode()]
    moveHelper.closestNode = closestNode
    moveHelper.closestDirection = ClosestPosition.InnerBefore

    getHandler(DragStopEvent)(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()

    expect(closestNode.prepend).toHaveBeenCalled()
    expect(selection.batchSafeSelect).toHaveBeenCalledWith(['prepend'])
    expect(moveHelper.dragDrop).toHaveBeenCalledWith({ dropNode: closestNode })
    expect(moveHelper.dragEnd).toHaveBeenCalled()
  })

  it('Inner 方向不允许追加时跳过', async () => {
    const { moveHelper, selection, getHandler } = createHarness()
    const closestNode = createNode({ id: 'closest', allowAppend: () => false })
    moveHelper.dragNodes = [createNode()]
    moveHelper.closestNode = closestNode
    moveHelper.closestDirection = ClosestPosition.Inner

    getHandler(DragStopEvent)(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()

    expect(closestNode.append).not.toHaveBeenCalled()
    expect(selection.batchSafeSelect).not.toHaveBeenCalled()
    expect(moveHelper.dragDrop).not.toHaveBeenCalled()
    expect(moveHelper.dragEnd).toHaveBeenCalled()
  })

  it('缺少最近节点或方向时仅结束拖拽', async () => {
    const { moveHelper, selection, getHandler } = createHarness()
    moveHelper.dragNodes = [createNode()]
    const handler = getHandler(DragStopEvent)

    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()
    moveHelper.closestDirection = ClosestPosition.Inner
    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()

    expect(selection.batchSafeSelect).not.toHaveBeenCalled()
    expect(moveHelper.dragEnd).toHaveBeenCalledTimes(2)
  })

  it('资源节点在过滤时展开子节点，自定义 getDropNodes 可替换结果', async () => {
    const { moveHelper, getHandler } = createHarness()
    const childA = createNode({ id: 'child-a' })
    const childB = createNode({ id: 'child-b' })
    const resource = createNode({ id: 'resource', componentName: '$$ResourceNode$$', children: [childA, childB] })
    const replacement = createNode({ id: 'replacement' })
    const transformConfig = {
      getDropNodes: vi.fn(() => [replacement]),
    }
    const transformed = createNode({ id: 'transformed', designerProps: transformConfig })
    const ignored = createNode({ id: 'ignored', designerProps: { getDropNodes: () => null } })
    const cloned = createNode({ id: 'cloned' })
    const clonedSource = createNode({
      id: 'cloned-source',
      isSourceNode: true,
      clone: vi.fn(() => cloned),
      designerProps: { getDropNodes: vi.fn(() => [cloned]) },
    })
    const closestNode = createNode({ id: 'closest' })
    moveHelper.dragNodes = [resource, transformed, ignored, clonedSource]
    moveHelper.closestNode = closestNode
    moveHelper.closestDirection = ClosestPosition.After

    getHandler(DragStopEvent)(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()
    expect(closestNode.insertAfter).toHaveBeenCalledWith(childA, childB, replacement, cloned)
    expect(clonedSource.clone).toHaveBeenCalledWith(clonedSource.parent)
    expect(moveHelper.dragEnd).toHaveBeenCalled()
  })

  it('通过 drag.drop 管道分发落点，异常时仍结束拖拽并重置光标', async () => {
    const { engine, moveHelper, selection, getHandler } = createHarness()
    const closestNode = createNode({ id: 'closest' })
    const dragNode = createNode({ id: 'drag' })
    moveHelper.dragNodes = [dragNode]
    moveHelper.closestNode = closestNode
    moveHelper.closestDirection = ClosestPosition.Inner
    const error = new Error('middleware error')
    const run = vi.fn(() => {
      throw error
    })
    engine.pipeline = { run }
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const handler = getHandler(DragStopEvent)

    handler(new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    await flush()

    expect(run).toHaveBeenCalledWith(
      DESIGNER_PIPELINES.dragDrop,
      expect.objectContaining({ node: closestNode, direction: ClosestPosition.Inner, dragNodes: [dragNode] }),
      expect.any(Function)
    )
    expect(consoleError).toHaveBeenCalledWith(error)
    expect(selection.batchSafeSelect).not.toHaveBeenCalled()
    expect(moveHelper.dragEnd).toHaveBeenCalled()
    expect(engine.cursor.setStyle).toHaveBeenCalledWith('')
    consoleError.mockRestore()
  })

  it('DragStop 落点处理在途时重复触发会被忽略，完成后恢复响应', async () => {
    const { engine, moveHelper, getHandler } = createHarness()
    const closestNode = createNode({ id: 'closest' })
    moveHelper.dragNodes = [createNode({ id: 'drag' })]
    moveHelper.closestNode = closestNode
    moveHelper.closestDirection = ClosestPosition.Inner
    let releaseRun: () => void = () => {}
    const gate = new Promise<void>(resolve => {
      releaseRun = resolve
    })
    const run = vi.fn(() => gate)
    engine.pipeline = { run }
    const stopEvent = () => new DragStopEvent({ target: document.body, clientX: 0, clientY: 0, pageX: 0, pageY: 0 })
    const handler = getHandler(DragStopEvent)

    handler(stopEvent())
    await flush()
    handler(stopEvent())
    await flush()
    expect(run).toHaveBeenCalledTimes(1)
    expect(moveHelper.dragEnd).not.toHaveBeenCalled()

    releaseRun()
    await flush()
    expect(run).toHaveBeenCalledTimes(1)
    expect(moveHelper.dragEnd).toHaveBeenCalledTimes(1)
    expect(engine.cursor.setStyle).toHaveBeenLastCalledWith('')

    // 在途任务释放后，新的 DragStop 可以再次进入管道
    handler(stopEvent())
    await flush()
    expect(run).toHaveBeenCalledTimes(2)
  })
})
