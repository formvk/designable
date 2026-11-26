import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DragMoveEvent } from '../../events/cursor/DragMoveEvent'
import { DragStartEvent } from '../../events/cursor/DragStartEvent'
import { DragStopEvent } from '../../events/cursor/DragStopEvent'
import { MouseMoveEvent } from '../../events/cursor/MouseMoveEvent'
import { CursorStatus } from '../../models/Cursor'
import { useCursorEffect } from '../useCursorEffect'

const createEngine = () => {
  const handlers = new Map<any, Array<(event: any) => void>>()
  const hover = { setHover: vi.fn(), clear: vi.fn() }
  const tree = { findById: vi.fn() }
  const workspace: any = { operation: { hover, tree } }
  const cursor: any = {
    status: CursorStatus.Normal,
    setStatus: vi.fn(status => {
      cursor.status = status
    }),
    setPosition: vi.fn(),
    setDragStartPosition: vi.fn(),
    setDragEndPosition: vi.fn(),
  }
  const engine: any = {
    props: {
      nodeIdAttrName: 'data-node-id',
      outlineNodeIdAttrName: 'data-outline-node-id',
    },
    cursor,
    workbench: { activeWorkspace: workspace },
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      const list = handlers.get(type) ?? []
      list.push(handler)
      handlers.set(type, list)
    }),
  }
  useCursorEffect(engine)
  const getHandlers = (type: any) => handlers.get(type) as Array<(event: any) => void>
  const emit = (type: any, event: any, context?: any) => {
    if (context) event.context = context
    getHandlers(type).forEach(handler => handler(event))
  }
  return { engine, cursor, hover, tree, workspace, emit }
}

const mouseMove = (target: EventTarget | null = null, extra: any = {}) =>
  new MouseMoveEvent({ target, clientX: 10, clientY: 20, pageX: 30, pageY: 40, ...extra })

const dragStart = () => new DragStartEvent({ target: null, clientX: 1, clientY: 2, pageX: 3, pageY: 4 })
const dragMove = () => new DragMoveEvent({ target: null, clientX: 5, clientY: 6, pageX: 7, pageY: 8 })
const dragStop = () => new DragStopEvent({ target: null, clientX: 9, clientY: 10, pageX: 11, pageY: 12 })

const createElement = (attrs: Record<string, string>) => {
  const element = document.createElement('div')
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value))
  const child = document.createElement('span')
  element.appendChild(child)
  document.body.appendChild(element)
  return child
}

describe('useCursorEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('普通状态下鼠标移动更新位置', () => {
    const { cursor, emit } = createEngine()

    emit(MouseMoveEvent, mouseMove())

    expect(cursor.setStatus).toHaveBeenCalledWith(CursorStatus.Normal)
    expect(cursor.setPosition).toHaveBeenCalledWith(expect.objectContaining({ clientX: 10, clientY: 20 }))
  })

  it('拖拽开始状态保留并更新位置，拖拽中不更新位置', () => {
    const { cursor, emit } = createEngine()
    cursor.status = CursorStatus.DragStart

    emit(MouseMoveEvent, mouseMove())
    expect(cursor.setStatus).toHaveBeenCalledWith(CursorStatus.DragStart)
    expect(cursor.setPosition).toHaveBeenCalledTimes(1)

    cursor.setPosition.mockClear()
    cursor.status = CursorStatus.Dragging
    emit(MouseMoveEvent, mouseMove())
    expect(cursor.setStatus).toHaveBeenCalledWith(CursorStatus.Dragging)
    expect(cursor.setPosition).not.toHaveBeenCalled()
  })

  it('拖拽开始、移动与结束更新光标位置与状态', () => {
    const { cursor, emit } = createEngine()

    emit(DragStartEvent, dragStart())
    expect(cursor.setStatus).toHaveBeenCalledWith(CursorStatus.DragStart)
    expect(cursor.setDragStartPosition).toHaveBeenCalled()

    emit(DragMoveEvent, dragMove())
    expect(cursor.setStatus).toHaveBeenCalledWith(CursorStatus.Dragging)
    expect(cursor.setPosition).toHaveBeenCalledWith(expect.objectContaining({ clientX: 5 }))

    emit(DragStopEvent, dragStop())
    expect(cursor.setStatus).toHaveBeenCalledWith(CursorStatus.DragStop)
    expect(cursor.setDragEndPosition).toHaveBeenCalled()
    expect(cursor.setDragStartPosition).toHaveBeenCalledWith(null)

    vi.runAllTimers()
    expect(cursor.status).toBe(CursorStatus.Normal)
  })

  it('非普通状态或缺少工作区时清除悬停', () => {
    const { cursor, hover, workspace, emit } = createEngine()
    cursor.status = CursorStatus.DragStart

    emit(MouseMoveEvent, mouseMove(), { workspace })
    expect(hover.clear).toHaveBeenCalled()

    hover.clear.mockClear()
    cursor.status = CursorStatus.Normal
    emit(MouseMoveEvent, mouseMove())
    expect(hover.clear).not.toHaveBeenCalled()
  })

  it('按节点 id 或 outline id 设置悬停节点', () => {
    const { hover, tree, workspace, emit } = createEngine()
    const node = { id: 'node-1' }
    tree.findById.mockReturnValue(node)

    emit(MouseMoveEvent, mouseMove(createElement({ 'data-node-id': 'node-1' })), { workspace })
    expect(tree.findById).toHaveBeenCalledWith('node-1')
    expect(hover.setHover).toHaveBeenCalledWith(node)

    emit(MouseMoveEvent, mouseMove(createElement({ 'data-outline-node-id': 'node-1' })), { workspace })
    expect(tree.findById).toHaveBeenCalledWith('node-1')

    tree.findById.mockReturnValue(undefined)
    hover.setHover.mockClear()
    emit(MouseMoveEvent, mouseMove(createElement({ 'data-node-id': 'missing' })), { workspace })
    expect(hover.setHover).not.toHaveBeenCalled()
    expect(hover.clear).toHaveBeenCalled()
  })

  it('目标未命中节点标记时保持悬停不变', () => {
    const { hover, workspace, emit } = createEngine()

    emit(MouseMoveEvent, mouseMove(document.createElement('div')), { workspace })
    expect(hover.clear).not.toHaveBeenCalled()
    expect(hover.setHover).not.toHaveBeenCalled()
  })
})
