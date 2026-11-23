import { Rect } from '@formvk/designable-shared'
import { describe, expect, it, vi } from 'vitest'

// 先加载 registry 以固定模块求值顺序，避免 models 与 shortcuts 之间的循环依赖
import '../../registry'
import { DragStopEvent } from '../../events/cursor/DragStopEvent'
import { CursorDragType, CursorType } from '../../models/Cursor'
import { useFreeSelectionEffect } from '../useFreeSelectionEffect'

const createHarness = () => {
  const nodes: any[] = []
  const rects = new Map<any, Rect>()
  const tree = {
    eachChildren: vi.fn((visitor: (node: any) => void) => nodes.forEach(visitor)),
  }
  const selection = { batchSafeSelect: vi.fn() }
  const viewport: any = {
    dragScrollXDelta: 0,
    dragScrollYDelta: 0,
    getOffsetPoint: vi.fn((point: any) => point),
    isPointInViewport: vi.fn(() => true),
    getValidNodeOffsetRect: vi.fn((node: any) => rects.get(node)),
  }
  const workspace: any = { operation: { tree, selection }, viewport }
  const handlers = new Map<any, (event: any) => void>()
  const cursor: any = {
    type: CursorType.Normal,
    dragType: CursorDragType.Move,
    dragStartPosition: { topClientX: 0, topClientY: 0 },
    position: { topClientX: 100, topClientY: 100 },
    setType: vi.fn(),
  }
  const engine: any = {
    cursor,
    workbench: {
      eachWorkspace: vi.fn((visitor: (workspace: any) => void) => visitor(workspace)),
    },
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      handlers.set(type, handler)
    }),
  }
  useFreeSelectionEffect(engine)
  const stop = () =>
    getHandler(DragStopEvent)(new DragStopEvent({ target: null, clientX: 100, clientY: 100, pageX: 100, pageY: 100 }))
  const getHandler = (type: any) => handlers.get(type) as (event: any) => void
  return { engine, cursor, tree, selection, viewport, nodes, rects, stop }
}

describe('useFreeSelectionEffect', () => {
  it('框选范围内的节点并跳过已选父节点的子节点', () => {
    const { cursor, selection, nodes, rects, stop } = createHarness()
    const child: any = { id: 'child', isMyParents: () => false }
    const parent: any = { id: 'parent', isMyParents: (node: any) => node === child }
    const partial: any = { id: 'partial', isMyParents: () => false }
    const outside: any = { id: 'outside', isMyParents: () => false }
    nodes.push(parent, child, partial, outside)
    rects.set(parent, new Rect(10, 10, 20, 20))
    rects.set(child, new Rect(12, 12, 5, 5))
    rects.set(partial, new Rect(50, 50, 100, 100))
    rects.set(outside, new Rect(200, 200, 10, 10))
    cursor.type = CursorType.Selection

    stop()

    expect(selection.batchSafeSelect).toHaveBeenCalledWith([parent, partial])
    expect(cursor.setType).toHaveBeenCalledWith(CursorType.Normal)
  })

  it('拖拽结束点不在视口内时跳过框选', () => {
    const { viewport, tree, selection, cursor, stop } = createHarness()
    viewport.isPointInViewport.mockReturnValue(false)
    cursor.type = CursorType.Selection

    stop()

    expect(tree.eachChildren).not.toHaveBeenCalled()
    expect(selection.batchSafeSelect).not.toHaveBeenCalled()
    expect(cursor.setType).toHaveBeenCalledWith(CursorType.Normal)
  })

  it('非移动拖拽类型时完全忽略', () => {
    const { cursor, tree, selection, stop } = createHarness()
    cursor.dragType = CursorDragType.Resize

    stop()

    expect(tree.eachChildren).not.toHaveBeenCalled()
    expect(selection.batchSafeSelect).not.toHaveBeenCalled()
    expect(cursor.setType).not.toHaveBeenCalled()
  })

  it('非框选类型时只选择节点不重置类型', () => {
    const { selection, nodes, rects, cursor, stop } = createHarness()
    const node: any = { id: 'node', isMyParents: () => false }
    nodes.push(node)
    rects.set(node, new Rect(10, 10, 20, 20))

    stop()

    expect(selection.batchSafeSelect).toHaveBeenCalledWith([node])
    expect(cursor.setType).not.toHaveBeenCalled()
  })
})
