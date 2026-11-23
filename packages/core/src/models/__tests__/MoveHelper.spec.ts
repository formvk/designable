import { Point, Rect } from '@formvk/designable-shared'
import { describe, expect, it, vi } from 'vitest'

import { CursorDragType } from '../Cursor'
import { ClosestPosition, MoveHelper } from '../MoveHelper'

const createNode = (overrides: any = {}) => {
  const node: any = {
    id: 'node',
    parent: undefined,
    root: undefined,
    children: [],
    allowDrag: () => true,
    allowAppend: () => true,
    allowSibling: () => true,
    contains: () => false,
    eachChildren(visitor: (node: any) => void) {
      node.children.forEach(visitor)
    },
    ...overrides,
  }
  return node
}

const createHelper = () => {
  const cursor = { setDragType: vi.fn() }
  const outline = {
    mounted: false,
    isPointInViewport: vi.fn(() => false),
    getValidNodeRect: vi.fn((node: any) => node?.rect || new Rect(0, 0, 100, 100)),
    getValidNodeLayout: vi.fn(() => 'vertical'),
    getChildrenRect: vi.fn(() => new Rect(0, 0, 50, 50)),
    getValidNodeOffsetRect: vi.fn((node: any) => node?.offsetRect || new Rect(1, 1, 100, 100)),
    getChildrenOffsetRect: vi.fn(() => new Rect(2, 2, 50, 50)),
    getElementRectById: vi.fn(),
    cacheElements: vi.fn(),
    clearCache: vi.fn(),
  }
  const viewport = {
    mounted: false,
    moveSensitive: false,
    moveInsertionType: 'block',
    isPointInViewport: vi.fn(() => true),
    getValidNodeRect: vi.fn((node: any) => node?.rect || new Rect(0, 0, 100, 100)),
    getValidNodeLayout: vi.fn(() => 'vertical'),
    getChildrenRect: vi.fn(() => new Rect(0, 0, 50, 50)),
    getValidNodeOffsetRect: vi.fn((node: any) => node?.offsetRect || new Rect(1, 1, 100, 100)),
    getChildrenOffsetRect: vi.fn(() => new Rect(2, 2, 50, 50)),
    getElementRectById: vi.fn(),
    cacheElements: vi.fn(),
    clearCache: vi.fn(),
  }
  const tree: any = createNode({ id: 'root', children: [] })
  tree.root = tree
  const operation = {
    tree,
    engine: { cursor },
    workspace: { viewport, outline },
    dispatch: vi.fn(),
  }
  return {
    helper: new MoveHelper({ operation } as any),
    operation,
    cursor,
    viewport,
    outline,
    tree,
  }
}

describe('MoveHelper', () => {
  it('基础 getter 与最近方向', () => {
    const { helper, cursor, viewport, outline } = createHelper()

    expect(helper.cursor).toBe(cursor)
    expect(helper.viewport).toBe(viewport)
    expect(helper.outline).toBe(outline)
    expect(helper.rootNode).toBe(helper.operation.tree)
    expect(helper.hasDragNodes).toBe(false)

    helper.dragNodes = [createNode()]
    expect(helper.hasDragNodes).toBe(true)

    helper.viewportClosestDirection = ClosestPosition.Before
    helper.outlineClosestDirection = ClosestPosition.After
    expect(helper.closestDirection).toBe(ClosestPosition.Before)

    helper.activeViewport = outline as any
    expect(helper.closestDirection).toBe(ClosestPosition.After)

    helper.closestNode = createNode()
    expect(helper.getClosestLayout(viewport as any)).toBe('vertical')
    expect(viewport.getValidNodeLayout).toHaveBeenCalledWith(helper.closestNode)
  })

  it('calcClosestPosition 缺少节点或不在视口时返回 Forbid', () => {
    const { helper, viewport } = createHelper()

    expect(helper.calcClosestPosition(new Point(50, 50), viewport as any)).toBe(ClosestPosition.Forbid)

    helper.closestNode = createNode()
    viewport.isPointInViewport = vi.fn(() => false)
    expect(helper.calcClosestPosition(new Point(50, 50), viewport as any)).toBe(ClosestPosition.Forbid)

    viewport.isPointInViewport = vi.fn(() => true)
    viewport.getValidNodeRect.mockReturnValueOnce(undefined)
    expect(helper.calcClosestPosition(new Point(50, 50), viewport as any)).toBeUndefined()
  })

  it('calcClosestPosition 命中内部时返回 Inner 系列', () => {
    const { helper, viewport } = createHelper()
    helper.dragNodes = [createNode()]

    const node = createNode({ contains: () => true })
    helper.closestNode = node

    expect(helper.calcClosestPosition(new Point(50, 90), viewport as any)).toBe(ClosestPosition.InnerAfter)
    expect(helper.calcClosestPosition(new Point(50, 10), viewport as any)).toBe(ClosestPosition.InnerBefore)

    node.contains = () => false
    expect(helper.calcClosestPosition(new Point(50, 50), viewport as any)).toBe(ClosestPosition.Inner)
  })

  it('calcClosestPosition 命中内部但不允许 append 时按兄弟位置返回', () => {
    const { helper, viewport } = createHelper()
    helper.dragNodes = [createNode()]
    const node = createNode({ allowAppend: () => false })
    helper.closestNode = node

    expect(helper.calcClosestPosition(new Point(50, 90), viewport as any)).toBe(ClosestPosition.Under)
    expect(helper.calcClosestPosition(new Point(50, 10), viewport as any)).toBe(ClosestPosition.Upper)

    viewport.getValidNodeLayout = vi.fn(() => 'horizontal')
    viewport.moveInsertionType = 'default'

    expect(helper.calcClosestPosition(new Point(90, 50), viewport as any)).toBe(ClosestPosition.After)
    expect(helper.calcClosestPosition(new Point(10, 50), viewport as any)).toBe(ClosestPosition.Before)
  })

  it('calcClosestPosition 命中内部时上溯到可接纳父级', () => {
    const { helper, viewport } = createHelper()
    helper.dragNodes = [createNode()]
    const parent = createNode({ id: 'parent', rect: new Rect(0, 0, 100, 60) })
    const node = createNode({
      allowAppend: () => false,
      allowSibling: () => false,
      parent,
    })
    helper.closestNode = node

    expect(helper.calcClosestPosition(new Point(50, 90), viewport as any)).toBe(ClosestPosition.Under)
    expect(helper.closestNode).toBe(parent)

    parent.rect = new Rect(0, 0, 200, 200)
    helper.closestNode = node
    expect(helper.calcClosestPosition(new Point(50, 90), viewport as any)).toBe(ClosestPosition.Upper)

    viewport.getValidNodeLayout = vi.fn(() => 'horizontal')
    viewport.moveInsertionType = 'default'
    parent.rect = new Rect(0, 0, 100, 60)
    helper.closestNode = node
    expect(helper.calcClosestPosition(new Point(50, 90), viewport as any)).toBe(ClosestPosition.After)

    parent.rect = new Rect(0, 0, 200, 200)
    helper.closestNode = node
    expect(helper.calcClosestPosition(new Point(50, 90), viewport as any)).toBe(ClosestPosition.Before)
  })

  it('calcClosestPosition 命中内部且无可接纳父级时返回 Forbid 系列', () => {
    const { helper, viewport } = createHelper()
    helper.dragNodes = [createNode()]
    helper.closestNode = createNode({ allowAppend: () => false, allowSibling: () => false })

    expect(helper.calcClosestPosition(new Point(50, 90), viewport as any)).toBe(ClosestPosition.ForbidUnder)
    expect(helper.calcClosestPosition(new Point(50, 10), viewport as any)).toBe(ClosestPosition.ForbidUpper)

    viewport.getValidNodeLayout = vi.fn(() => 'horizontal')
    viewport.moveInsertionType = 'default'

    expect(helper.calcClosestPosition(new Point(90, 50), viewport as any)).toBe(ClosestPosition.ForbidAfter)
    expect(helper.calcClosestPosition(new Point(10, 50), viewport as any)).toBe(ClosestPosition.ForbidBefore)
  })

  it('calcClosestPosition 命中根节点外部时返回 Inner 系列', () => {
    const { helper, viewport, tree } = createHelper()
    helper.closestNode = tree

    expect(helper.calcClosestPosition(new Point(500, 90), viewport as any)).toBe(ClosestPosition.InnerAfter)
    expect(helper.calcClosestPosition(new Point(500, 10), viewport as any)).toBe(ClosestPosition.InnerBefore)
  })

  it('calcClosestPosition 命中普通节点外部时返回兄弟位置', () => {
    const { helper, viewport } = createHelper()
    helper.closestNode = createNode()

    expect(helper.calcClosestPosition(new Point(500, 90), viewport as any)).toBe(ClosestPosition.Under)
    expect(helper.calcClosestPosition(new Point(500, 10), viewport as any)).toBe(ClosestPosition.Upper)

    viewport.getValidNodeLayout = vi.fn(() => 'horizontal')
    viewport.moveInsertionType = 'default'

    expect(helper.calcClosestPosition(new Point(500, 90), viewport as any)).toBe(ClosestPosition.After)
    expect(helper.calcClosestPosition(new Point(-10, -10), viewport as any)).toBe(ClosestPosition.Before)
  })

  it('calcClosestPosition 命中普通节点外部时上溯父级或返回 Forbid', () => {
    const { helper, viewport } = createHelper()
    helper.dragNodes = [createNode()]
    const parent = createNode({ id: 'parent', rect: new Rect(0, 0, 100, 60) })
    const node = createNode({ allowSibling: () => false, parent })
    helper.closestNode = node

    expect(helper.calcClosestPosition(new Point(500, 90), viewport as any)).toBe(ClosestPosition.Under)
    expect(helper.closestNode).toBe(parent)

    parent.rect = new Rect(0, 0, 200, 200)
    helper.closestNode = node
    expect(helper.calcClosestPosition(new Point(500, 90), viewport as any)).toBe(ClosestPosition.Upper)

    viewport.getValidNodeLayout = vi.fn(() => 'horizontal')
    viewport.moveInsertionType = 'default'
    parent.rect = new Rect(0, 0, 100, 60)
    helper.closestNode = node
    expect(helper.calcClosestPosition(new Point(500, 90), viewport as any)).toBe(ClosestPosition.After)

    parent.rect = new Rect(0, 0, 200, 200)
    helper.closestNode = node
    expect(helper.calcClosestPosition(new Point(-10, -10), viewport as any)).toBe(ClosestPosition.Before)

    viewport.moveInsertionType = 'block'
    viewport.getValidNodeLayout = vi.fn(() => 'vertical')
    helper.closestNode = createNode({ allowSibling: () => false })
    expect(helper.calcClosestPosition(new Point(500, 90), viewport as any)).toBe(ClosestPosition.ForbidUnder)
    expect(helper.calcClosestPosition(new Point(500, 10), viewport as any)).toBe(ClosestPosition.ForbidUpper)

    viewport.getValidNodeLayout = vi.fn(() => 'horizontal')
    viewport.moveInsertionType = 'default'
    helper.closestNode = createNode({ allowSibling: () => false })
    expect(helper.calcClosestPosition(new Point(500, 90), viewport as any)).toBe(ClosestPosition.ForbidAfter)
    expect(helper.calcClosestPosition(new Point(-10, -10), viewport as any)).toBe(ClosestPosition.ForbidBefore)
  })

  it('calcClosestNode 依据触摸节点与子节点距离选择节点', () => {
    const { helper, viewport, tree } = createHelper()

    expect(helper.calcClosestNode(new Point(0, 0), viewport as any)).toBe(tree)

    const touchNode: any = createNode({ id: 'touch' })
    helper.touchNode = touchNode
    viewport.getValidNodeRect.mockReturnValueOnce(undefined)
    expect(helper.calcClosestNode(new Point(0, 0), viewport as any)).toBeUndefined()

    viewport.getValidNodeRect.mockReturnValue(new Rect(0, 0, 100, 100))
    const nearChild = createNode({ id: 'near' })
    const farChild = createNode({ id: 'far' })
    const missingChild = createNode({ id: 'missing' })
    touchNode.children = [nearChild, farChild, missingChild]
    viewport.getElementRectById = vi.fn((id: string) => {
      if (id === 'near') return new Rect(10, 10, 20, 20)
      if (id === 'far') return new Rect(300, 300, 20, 20)
      return undefined
    })

    expect(helper.calcClosestNode(new Point(15, 15), viewport as any)).toBe(nearChild)

    touchNode.children = []
    expect(helper.calcClosestNode(new Point(15, 15), viewport as any)).toBe(touchNode)
  })

  it('calcClosestRect / calcClosestOffsetRect 依据方向选择矩形', () => {
    const { helper, viewport } = createHelper()

    expect(helper.calcClosestRect(viewport as any)).toBeUndefined()
    expect(helper.calcClosestOffsetRect(viewport as any)).toBeUndefined()

    helper.closestNode = createNode()
    expect(helper.calcClosestRect(viewport as any)).toBeUndefined()
    expect(helper.calcClosestOffsetRect(viewport as any)).toBeUndefined()

    expect(helper.calcClosestRect(viewport as any, ClosestPosition.Inner)).toEqual(new Rect(0, 0, 100, 100))
    expect(helper.calcClosestRect(viewport as any, ClosestPosition.InnerAfter)).toEqual(new Rect(0, 0, 50, 50))
    expect(helper.calcClosestRect(viewport as any, ClosestPosition.InnerBefore)).toEqual(new Rect(0, 0, 50, 50))

    expect(helper.calcClosestOffsetRect(viewport as any, ClosestPosition.Under)).toEqual(new Rect(1, 1, 100, 100))
    expect(helper.calcClosestOffsetRect(viewport as any, ClosestPosition.InnerAfter)).toEqual(new Rect(2, 2, 50, 50))
    expect(helper.calcClosestOffsetRect(viewport as any, ClosestPosition.InnerBefore)).toEqual(new Rect(2, 2, 50, 50))
  })

  it('dragStart 过滤可拖拽节点并派发事件', () => {
    const { helper, cursor, viewport, operation, tree } = createHelper()

    helper.dragStart({ dragNodes: [] })
    expect(helper.dragging).toBe(false)

    helper.dragStart({ dragNodes: [createNode({ allowDrag: () => false })] })
    expect(helper.dragging).toBe(false)
    expect(operation.dispatch).not.toHaveBeenCalled()

    const node = createNode({ id: 'a', componentName: 'Input' })
    helper.dragStart({ dragNodes: [node] })
    expect(helper.dragging).toBe(true)
    expect(helper.dragNodes).toEqual([node])
    expect(viewport.cacheElements).toHaveBeenCalled()
    expect(cursor.setDragType).toHaveBeenLastCalledWith(CursorDragType.Move)

    const event = operation.dispatch.mock.calls[0][0]
    expect(event.type).toBe('drag:node')
    expect(event.data.target).toBe(tree)
    expect(event.data.source).toBe(helper.dragNodes)
  })

  it('dragStart 支持 getDragNodes 与资源节点展开', () => {
    const { helper } = createHelper()
    const extra = createNode({ id: 'extra' })
    const custom = createNode({
      id: 'custom',
      componentName: 'Custom',
      designerProps: { getDragNodes: () => [extra] },
    })
    helper.dragStart({ dragNodes: [custom] })
    expect(helper.dragNodes).toEqual([extra])

    const ignored = createNode({
      id: 'ignored',
      componentName: 'Ignored',
      designerProps: { getDragNodes: () => null },
    })
    helper.dragStart({ dragNodes: [ignored] })
    expect(helper.dragNodes).toEqual([extra])

    const child = createNode({ id: 'child' })
    const resource = createNode({
      id: 'resource',
      componentName: '$$ResourceNode$$',
      children: [child],
    })
    helper.dragStart({ dragNodes: [resource] })
    expect(helper.dragNodes).toEqual([child])
  })

  it('dragMove 在 outline 与 viewport 间切换激活视口', () => {
    const { helper, outline, viewport, tree } = createHelper()

    helper.dragMove({ point: new Point(50, 50), touchNode: undefined as any })
    expect(helper.activeViewport).toBeUndefined()

    helper.dragging = true
    outline.mounted = true
    outline.isPointInViewport = vi.fn(() => true)
    viewport.isPointInViewport = vi.fn(() => false)

    helper.dragMove({ point: new Point(50, 50), touchNode: undefined as any })

    expect(helper.activeViewport).toBe(outline)
    expect(helper.touchNode).toBeUndefined()
    expect(helper.closestNode).toBe(tree)
    expect(helper.outlineClosestDirection).toBe(ClosestPosition.Inner)
    expect(helper.viewportClosestDirection).toBe(ClosestPosition.Inner)
    expect(helper.outlineClosestRect).toEqual(new Rect(0, 0, 100, 100))
    expect(helper.outlineClosestOffsetRect).toEqual(new Rect(1, 1, 100, 100))
    expect(helper.viewportClosestRect).toBeUndefined()

    outline.isPointInViewport = vi.fn(() => false)
    viewport.isPointInViewport = vi.fn(() => true)
    viewport.mounted = true
    tree.contains = () => true

    helper.dragMove({ point: new Point(50, 90), touchNode: undefined as any })

    expect(helper.activeViewport).toBe(viewport)
    expect(helper.closestNode).toBe(tree)
    expect(helper.viewportClosestDirection).toBe(ClosestPosition.InnerAfter)
    expect(helper.outlineClosestDirection).toBe(ClosestPosition.InnerAfter)
    expect(helper.viewportClosestRect).toEqual(new Rect(0, 0, 50, 50))
    expect(helper.viewportClosestOffsetRect).toEqual(new Rect(2, 2, 50, 50))
    expect(helper.outlineClosestRect).toEqual(new Rect(0, 0, 50, 50))
    expect(helper.outlineClosestOffsetRect).toEqual(new Rect(2, 2, 50, 50))
  })

  it('dragDrop 派发 drop 事件', () => {
    const { helper, operation, tree } = createHelper()
    const dropNode = createNode()

    helper.dragDrop({ dropNode: dropNode as any })

    const event = operation.dispatch.mock.calls[0][0]
    expect(event.type).toBe('drop:node')
    expect(event.data.target).toBe(tree)
    expect(event.data.source).toBe(dropNode)
  })

  it('dragEnd 重置全部拖拽状态', () => {
    const { helper, viewport } = createHelper()
    helper.dragging = true
    helper.dragNodes = [createNode()]
    helper.touchNode = createNode()
    helper.closestNode = createNode()
    helper.activeViewport = viewport as any
    helper.outlineClosestDirection = ClosestPosition.After
    helper.outlineClosestOffsetRect = new Rect(0, 0, 1, 1)
    helper.outlineClosestRect = new Rect(0, 0, 2, 2)
    helper.viewportClosestDirection = ClosestPosition.Before
    helper.viewportClosestOffsetRect = new Rect(0, 0, 3, 3)
    helper.viewportClosestRect = new Rect(0, 0, 4, 4)

    helper.dragEnd()

    expect(helper.dragging).toBe(false)
    expect(helper.dragNodes).toEqual([])
    expect(helper.touchNode).toBeUndefined()
    expect(helper.closestNode).toBeUndefined()
    expect(helper.activeViewport).toBeUndefined()
    expect(helper.outlineClosestDirection).toBeUndefined()
    expect(helper.outlineClosestOffsetRect).toBeUndefined()
    expect(helper.outlineClosestRect).toBeUndefined()
    expect(helper.viewportClosestDirection).toBeUndefined()
    expect(helper.viewportClosestOffsetRect).toBeUndefined()
    expect(helper.viewportClosestRect).toBeUndefined()
    expect(viewport.clearCache).toHaveBeenCalled()
  })
})
