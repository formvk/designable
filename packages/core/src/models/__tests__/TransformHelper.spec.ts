import { calcEdgeLinesOfRect, Point, Rect } from '@formvk/designable-shared'
import { describe, expect, it, vi } from 'vitest'

import { CursorDragType } from '../Cursor'
import { SnapLine } from '../SnapLine'
import { TransformHelper } from '../TransformHelper'

const createHelper = () => {
  const cursor = {
    dragStartToCurrentDelta: { clientX: 0, clientY: 0 },
    position: { clientX: 0, clientY: 0 },
    dragStartPosition: { clientX: 0, clientY: 0 },
    setDragType: vi.fn(),
  }
  const viewport = {
    getOffsetPoint: (point: any) => new Point(point.x, point.y),
    isRectInViewport: vi.fn((_rect?: Rect) => true),
  }
  const tree = { eachTree: vi.fn(), findById: vi.fn() }
  const operation = {
    tree,
    engine: { cursor },
    workspace: { viewport },
    dispatch: vi.fn(),
  }
  return {
    helper: new TransformHelper({ operation } as any),
    operation,
    cursor,
    viewport,
    tree,
  }
}

const createLine = (helper: TransformHelper, line: any) =>
  new SnapLine(helper, {
    distance: 0,
    start: { x: 0, y: 0 },
    end: { x: 100, y: 0 },
    ...line,
  })

const createNode = (overrides: any = {}) => ({
  id: 'node',
  getValidElementOffsetRect: () => new Rect(0, 0, 10, 10),
  getElement: () => undefined,
  getElementOffsetRect: () => undefined,
  ...overrides,
})

describe('TransformHelper', () => {
  it('基础 getter 与拖拽增量', () => {
    const { helper, cursor, tree, viewport } = createHelper()
    cursor.dragStartToCurrentDelta = { clientX: 10, clientY: 20 }

    expect(helper.tree).toBe(tree)
    expect(helper.cursor).toBe(cursor)
    expect(helper.viewport).toBe(viewport)
    expect(helper.deltaX).toBe(10)
    expect(helper.deltaY).toBe(20)
  })

  it('cursorDragNodesRect 计算 translate 拖拽区域', () => {
    const { helper, cursor } = createHelper()
    helper.type = 'translate'
    helper.draggingNodesRect = new Rect(0, 0, 100, 50)
    helper.dragStartNodesRect = new Rect(10, 10, 100, 50)
    cursor.dragStartPosition = { clientX: 20, clientY: 30 }
    cursor.position = { clientX: 50, clientY: 60 }

    expect(helper.cursorDragNodesRect).toEqual(new Rect(40, 40, 100, 50))
    expect(helper.cursorDragNodesEdgeLines).toEqual(calcEdgeLinesOfRect(new Rect(40, 40, 100, 50)))
    expect(helper.cursorOffset).toEqual(new Point(50, 60))
    expect(helper.dragStartCursorOffset).toEqual(new Point(10, 20))
  })

  it('cursorDragNodesRect 按 resize 方向计算区域', () => {
    const { helper, cursor } = createHelper()
    helper.type = 'resize'
    helper.dragStartNodesRect = new Rect(10, 10, 100, 100)
    cursor.dragStartPosition = { clientX: 20, clientY: 30 }
    cursor.position = { clientX: 50, clientY: 60 }
    cursor.dragStartToCurrentDelta = { clientX: 10, clientY: 15 }

    const cases: Array<[string, Rect]> = [
      ['left-top', new Rect(40, 40, 90, 85)],
      ['left-center', new Rect(40, 10, 90, 100)],
      ['left-bottom', new Rect(40, 10, 90, 85)],
      ['center-top', new Rect(10, 40, 100, 85)],
      ['center-bottom', new Rect(10, 10, 100, 115)],
      ['right-top', new Rect(10, 40, 110, 85)],
      ['right-center', new Rect(10, 10, 110, 100)],
      ['right-bottom', new Rect(10, 10, 110, 85)],
    ]

    cases.forEach(([direction, rect]) => {
      helper.direction = direction
      expect(helper.cursorDragNodesRect).toEqual(rect)
    })

    helper.direction = 'unknown'
    expect(helper.cursorDragNodesRect).toBeUndefined()

    helper.direction = 'left-top'
    helper.dragStartNodesRect = undefined
    expect(helper.cursorDragNodesRect).toBeUndefined()

    helper.dragStartNodesRect = new Rect(10, 10, 100, 100)
    cursor.dragStartToCurrentDelta = { clientX: 0, clientY: 0 }
    expect(helper.cursorDragNodesRect).toBeUndefined()
  })

  it('dragNodesRect 依据拖拽节点合并区域', () => {
    const { helper } = createHelper()
    helper.dragNodes = [
      createNode({ getValidElementOffsetRect: () => new Rect(10, 10, 20, 20) }),
      createNode({ getValidElementOffsetRect: () => new Rect(40, 40, 20, 20) }),
      createNode({ getValidElementOffsetRect: () => undefined }),
    ]

    expect(helper.dragNodesRect).toEqual(new Rect(10, 10, 50, 50))
    expect(helper.dragNodesEdgeLines).toEqual(calcEdgeLinesOfRect(new Rect(10, 10, 50, 50)))

    helper.draggingNodesRect = new Rect(0, 0, 100, 100)
    expect(helper.dragNodesRect).toEqual(new Rect(0, 0, 100, 100))
  })

  it('calcBaseTranslate / calcBaseResize 读取起始存储', () => {
    const { helper, cursor } = createHelper()
    cursor.dragStartToCurrentDelta = { clientX: 10, clientY: 20 }
    helper.dragStartTranslateStore = { n1: { x: 5, y: 6 } }
    helper.dragStartSizeStore = { n1: { width: 100, height: 50 } }

    expect(helper.calcBaseTranslate({ id: 'n1' } as any)).toEqual({ x: 15, y: 26 })
    expect(helper.calcBaseTranslate({ id: 'missing' } as any)).toEqual({ x: 10, y: 20 })

    const cases: Array<[string, Rect]> = [
      ['left-top', new Rect(15, 26, 90, 30)],
      ['left-center', new Rect(15, 6, 90, 50)],
      ['left-bottom', new Rect(15, 6, 90, 70)],
      ['center-bottom', new Rect(5, 6, 100, 70)],
      ['center-top', new Rect(5, 26, 100, 30)],
      ['right-top', new Rect(5, 26, 110, 30)],
      ['right-bottom', new Rect(5, 6, 110, 70)],
      ['right-center', new Rect(5, 6, 110, 50)],
    ]

    cases.forEach(([direction, rect]) => {
      helper.direction = direction
      expect(helper.calcBaseResize({ id: 'n1' } as any)).toEqual(rect)
    })

    helper.direction = 'unknown'
    expect(helper.calcBaseResize({ id: 'n1' } as any)).toBeUndefined()
  })

  it('calcDragStartStore 记录节点起始翻译与尺寸', () => {
    const { helper } = createHelper()
    helper.draggingNodesRect = new Rect(0, 0, 100, 100)
    const element = document.createElement('div')
    element.style.transform = 'translate(5px, 6px)'

    helper.calcDragStartStore([
      createNode({
        id: 'n1',
        getElement: () => element,
        getElementOffsetRect: () => new Rect(0, 0, 80, 60),
      }),
      createNode({ id: 'n2', getElement: () => element }),
      createNode({ id: 'n3', getElementOffsetRect: () => new Rect(0, 0, 80, 60) }),
    ])

    expect(helper.dragStartNodesRect).toEqual(new Rect(0, 0, 100, 100))
    expect(helper.dragStartTranslateStore.n1).toEqual({ x: 5, y: 6 })
    expect(helper.dragStartSizeStore.n1).toEqual({ width: 80, height: 60 })
    expect(helper.dragStartTranslateStore.n2).toEqual({ x: 5, y: 6 })
    expect(helper.dragStartSizeStore.n2).toBeUndefined()
    expect(helper.dragStartTranslateStore.n3).toBeUndefined()
  })

  it('rulerSnapLine 支持增删查与距离计算', () => {
    const { helper } = createHelper()

    helper.addRulerSnapLine({ start: { x: 0, y: 0 } } as any)
    expect(helper.rulerSnapLines).toHaveLength(0)

    helper.addRulerSnapLine({ id: 'r1', start: { x: 0, y: 50 }, end: { x: 100, y: 50 }, distance: 0 })
    expect(helper.rulerSnapLines).toHaveLength(1)
    const id = helper.rulerSnapLines[0].id
    expect(helper.findRulerSnapLine(id)).toBe(helper.rulerSnapLines[0])
    expect(helper.findRulerSnapLine('missing')).toBeUndefined()

    helper.addRulerSnapLine({ id: 'r1', start: { x: 0, y: 50 }, end: { x: 100, y: 50 }, distance: 0 })
    expect(helper.rulerSnapLines).toHaveLength(1)

    const lines = helper.calcRulerSnapLines(new Rect(0, 0, 100, 60))
    expect(lines[0].distance).toBe(10)

    helper.removeRulerSnapLine('missing')
    expect(helper.rulerSnapLines).toHaveLength(1)
    helper.removeRulerSnapLine(id)
    expect(helper.rulerSnapLines).toHaveLength(0)
  })

  it('thresholdSnapLines 汇总参考线', () => {
    const { helper } = createHelper()
    helper.dragging = true
    const around = createLine(helper, {})
    const closeRuler = createLine(helper, {
      start: { x: 0, y: 0 },
      end: { x: 0, y: 100 },
      distance: 2,
    })
    const farRuler = createLine(helper, {
      start: { x: 0, y: 500 },
      end: { x: 0, y: 600 },
      distance: 100,
    })
    const spaceLine = createLine(helper, {
      start: { x: 0, y: 0 },
      end: { x: 0, y: 100 },
      distance: 0,
    })
    helper.aroundSnapLines = [around]
    helper.rulerSnapLines = [closeRuler, farRuler]
    helper.aroundSpaceBlocks = { top: { snapLine: spaceLine } } as any

    expect(helper.thresholdSnapLines).toEqual([around, closeRuler, spaceLine])

    helper.dragging = false
    expect(helper.thresholdSnapLines).toEqual([])
  })

  it('closestSnapLines 去重并保留最近的参考线', () => {
    const { helper, cursor } = createHelper()
    helper.dragging = true
    helper.type = 'translate'
    helper.draggingNodesRect = new Rect(0, 0, 100, 100)
    cursor.dragStartPosition = { clientX: 0, clientY: 0 }
    cursor.position = { clientX: 0, clientY: 0 }
    const farLine = createLine(helper, { start: { x: 0, y: 50 }, end: { x: 100, y: 50 }, distance: 4 })
    const nearLine = createLine(helper, {
      start: { x: 0, y: 50 },
      end: { x: 100, y: 50 },
      distance: 2,
    })
    helper.aroundSnapLines = [farLine, nearLine]

    expect(helper.closestSnapLines).toEqual([nearLine])

    helper.dragging = false
    expect(helper.closestSnapLines).toEqual([])
  })

  it('closestSpaceBlocks 过滤不可用与过远的间距块', () => {
    const { helper } = createHelper()
    helper.dragging = true
    helper.draggingNodesRect = new Rect(0, 0, 100, 100)
    helper.type = 'translate'
    const iso = { distance: 10 }
    const block = {
      snapLine: createLine(helper, { start: { x: 0, y: 50 }, end: { x: 100, y: 50 } }),
      isometrics: [iso],
    }
    helper.aroundSpaceBlocks = { top: block } as any
    expect(helper.closestSpaceBlocks).toEqual([block])

    helper.aroundSpaceBlocks = { top: { snapLine: undefined, isometrics: [] } } as any
    expect(helper.closestSpaceBlocks).toEqual([])
  })

  it('thresholdSpaceBlocks / measurerSpaceBlocks 依据状态返回', () => {
    const { helper } = createHelper()
    const iso = { distance: 10 } as any
    const block = { snapLine: { distance: 0 }, isometrics: [iso] } as any
    helper.aroundSpaceBlocks = { top: block } as any

    expect(helper.thresholdSpaceBlocks).toEqual([])
    expect(helper.measurerSpaceBlocks).toEqual([])

    helper.dragging = true
    expect(helper.thresholdSpaceBlocks).toEqual([block, iso])
    expect(helper.measurerSpaceBlocks).toEqual([])

    helper.snapped = true
    expect(helper.measurerSpaceBlocks).toEqual([block])

    helper.aroundSpaceBlocks = { top: { snapLine: undefined } } as any
    expect(helper.thresholdSpaceBlocks).toEqual([])

    helper.aroundSpaceBlocks = { top: { snapLine: { distance: 5 }, isometrics: [] } } as any
    expect(helper.thresholdSpaceBlocks).toEqual([])
  })

  it('calcAroundSnapLines 遍历视口节点生成参考线', () => {
    const { helper, tree } = createHelper()
    helper.type = 'translate'
    helper.dragNodes = []
    helper.viewportRectsStore = { n1: new Rect(100, 0, 100, 100) }
    tree.findById = vi.fn(() => ({ id: 'n1' }))

    const lines = helper.calcAroundSnapLines(new Rect(0, 0, 100, 100))
    expect(lines.length).toBeGreaterThan(0)
    lines.forEach(line => expect(line.distance).toBeLessThan(TransformHelper.threshold))

    helper.viewportRectsStore = { n1: new Rect(102, 2, 100, 100) }
    helper.snapping = true
    expect(helper.calcAroundSnapLines(new Rect(0, 0, 100, 100))).toEqual([])
    helper.snapping = false
    expect(helper.calcAroundSnapLines(new Rect(0, 0, 100, 100)).length).toBeGreaterThan(0)

    helper.type = 'resize'
    helper.viewportRectsStore = { n1: new Rect(100, 0, 100, 100) }
    expect(helper.calcAroundSnapLines(new Rect(50, 50, 100, 100)).length).toBeGreaterThan(0)
  })

  it('calcAroundSpaceBlocks 选择最近的间距块', () => {
    const { helper, tree } = createHelper()
    helper.viewportRectsStore = {
      same: new Rect(0, 0, 100, 100),
      topFar: new Rect(120, 20, 50, 20),
      topNear: new Rect(100, 40, 50, 20),
      bottom: new Rect(120, 240, 50, 20),
    }
    tree.findById = vi.fn((id: string) => ({ id }))

    const blocks = helper.calcAroundSpaceBlocks(new Rect(100, 100, 100, 100))

    expect(blocks.top.distance).toBe(40)
    expect(blocks.top.refer.id).toBe('topNear')
    expect(blocks.bottom.distance).toBe(40)
    expect(blocks.bottom.refer.id).toBe('bottom')
  })

  it('calcViewportNodes 只缓存视口内且非拖拽节点', () => {
    const { helper, tree, viewport } = createHelper()
    const inside = createNode({ id: 'inside', getValidElementRect: () => new Rect(0, 0, 10, 10) })
    const hidden = createNode({ id: 'hidden', getValidElementRect: () => new Rect(500, 0, 10, 10) })
    const dragged = createNode({ id: 'dragged', getValidElementRect: () => new Rect(0, 0, 10, 10) })
    tree.eachTree = vi.fn((callback: any) => [inside, hidden, dragged].forEach(callback))
    tree.findById = vi.fn((id: string) => ({ id }))
    viewport.isRectInViewport = vi.fn((rect: Rect) => rect.x < 100)
    helper.dragNodes = [dragged]

    helper.calcViewportNodes()

    expect(helper.viewportRectsStore).toEqual({ inside: new Rect(0, 0, 10, 10) })
    expect(helper.getNodeRect(inside as any)).toEqual(new Rect(0, 0, 10, 10))

    const visited: string[] = []
    helper.eachViewportNodes((node, rect) => {
      visited.push(`${node.id}:${rect.x}`)
    })
    expect(visited).toEqual(['inside:0'])
  })

  it('translate / resize 应用吸附并回调', () => {
    const { helper, cursor } = createHelper()
    const handler = vi.fn()

    helper.translate({ id: 'n1' } as any, handler)
    helper.resize({ id: 'n1' } as any, handler)
    expect(handler).not.toHaveBeenCalled()

    helper.dragging = true
    cursor.dragStartToCurrentDelta = { clientX: 10, clientY: 20 }
    helper.dragStartTranslateStore = { n1: { x: 1, y: 2 } }
    helper.dragStartSizeStore = { n1: { width: 100, height: 50 } }
    helper.direction = 'right-bottom'

    helper.translate({ id: 'n1' } as any, handler)
    expect(handler).toHaveBeenLastCalledWith({ x: 11, y: 22 })

    helper.resize({ id: 'n1' } as any, handler)
    expect(handler).toHaveBeenLastCalledWith(new Rect(1, 2, 110, 70))
    expect(helper.snapped).toBe(false)
    expect(helper.snapping).toBe(false)
  })

  it('dragStart 按类型过滤节点并切换拖拽状态', () => {
    const { helper, cursor, tree } = createHelper()
    tree.eachTree = vi.fn()

    helper.dragStart({ type: 'resize', direction: 'left-top', dragNodes: [] })
    expect(helper.dragging).toBe(false)

    const resizable = createNode({ id: 'resize', allowResize: () => true })
    helper.dragStart({ type: 'resize', direction: 'left-top', dragNodes: [resizable] })
    expect(helper.dragging).toBe(true)
    expect(helper.type).toBe('resize')
    expect(helper.direction).toBe('left-top')
    expect(helper.dragNodes).toEqual([resizable])
    expect(cursor.setDragType).toHaveBeenLastCalledWith(CursorDragType.Resize)
    expect(tree.eachTree).toHaveBeenCalled()

    helper.dragEnd()
    expect(helper.dragging).toBe(false)
    expect(helper.dragNodes).toEqual([])
    expect(cursor.setDragType).toHaveBeenLastCalledWith(CursorDragType.Move)

    const translatable = createNode({ id: 'translate', allowTranslate: () => true })
    helper.dragStart({ type: 'translate', dragNodes: [translatable] })
    expect(helper.type).toBe('translate')
    expect(cursor.setDragType).toHaveBeenLastCalledWith(CursorDragType.Translate)

    const rotatable = createNode({ id: 'rotate', allowRotate: () => true })
    helper.dragStart({ type: 'rotate', dragNodes: [rotatable] })
    expect(cursor.setDragType).toHaveBeenLastCalledWith(CursorDragType.Rotate)

    const scalable = createNode({ id: 'scale', allowScale: () => true })
    helper.dragStart({ type: 'scale', dragNodes: [scalable] })
    expect(cursor.setDragType).toHaveBeenLastCalledWith(CursorDragType.Scale)

    const roundable = createNode({ id: 'round', allowRound: () => true })
    helper.dragStart({ type: 'round', dragNodes: [roundable] })
    expect(cursor.setDragType).toHaveBeenLastCalledWith(CursorDragType.Round)
  })

  it('dragMove 重新计算参考线与间距块', () => {
    const { helper, tree } = createHelper()
    tree.eachTree = vi.fn()
    tree.findById = vi.fn()
    helper.dragging = true
    helper.type = 'translate'
    helper.draggingNodesRect = new Rect(0, 0, 100, 100)
    helper.dragNodes = [createNode({ getValidElementOffsetRect: () => new Rect(0, 0, 100, 100) })]

    helper.dragMove()

    expect(helper.draggingNodesRect).toEqual(new Rect(0, 0, 100, 100))
    expect(helper.viewportRectsStore).toEqual({})
  })
})
