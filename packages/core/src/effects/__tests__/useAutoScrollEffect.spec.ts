import { describe, expect, it, vi } from 'vitest'

const { scrollAnimateMock } = vi.hoisted(() => ({
  scrollAnimateMock: vi.fn((_container?: any, _direction?: any) => vi.fn()),
}))

vi.mock('@formvk/designable-shared', async importOriginal => {
  const actual = await importOriginal<any>()
  return { ...actual, scrollAnimate: scrollAnimateMock }
})

// 先加载 registry 以固定模块求值顺序，避免 models 与 shortcuts 之间的循环依赖
import '../../registry'
import { DragMoveEvent } from '../../events/cursor/DragMoveEvent'
import { DragStartEvent } from '../../events/cursor/DragStartEvent'
import { DragStopEvent } from '../../events/cursor/DragStopEvent'
import { CursorStatus } from '../../models/Cursor'
import { useAutoScrollEffect } from '../useAutoScrollEffect'

const createHarness = () => {
  const scrollContainer = document.createElement('div')
  const viewport: any = {
    rect: new DOMRect(0, 0, 100, 100),
    scrollContainer,
    isPointInViewport: vi.fn(() => true),
    takeDragStartSnapshot: vi.fn(),
  }
  const outline: any = {
    rect: new DOMRect(0, 0, 100, 100),
    scrollContainer: document.createElement('div'),
    isPointInViewport: vi.fn(() => false),
    takeDragStartSnapshot: vi.fn(),
  }
  const workspace: any = { viewport, outline }
  const handlers = new Map<any, (event: any) => void>()
  const cursor: any = { status: CursorStatus.Normal }
  const engine: any = {
    cursor,
    workbench: {
      eachWorkspace: vi.fn((visitor: (workspace: any) => void) => visitor(workspace)),
    },
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      handlers.set(type, handler)
    }),
  }
  useAutoScrollEffect(engine)
  const getHandler = (type: any) => handlers.get(type) as (event: any) => void
  const moveEvent = (clientX: number, clientY: number) =>
    new DragMoveEvent({ target: null, clientX, clientY, pageX: clientX, pageY: clientY })
  return { engine, cursor, viewport, outline, workspace, getHandler, moveEvent }
}

describe('useAutoScrollEffect', () => {
  it('拖拽开始时记录视口快照', () => {
    const { viewport, getHandler } = createHarness()

    getHandler(DragStartEvent)(new DragStartEvent({ target: null, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))

    expect(viewport.takeDragStartSnapshot).toHaveBeenCalled()
  })

  it('拖拽到视口边缘时启动并重置自动滚动动画', () => {
    const { cursor, viewport, getHandler, moveEvent } = createHarness()
    cursor.status = CursorStatus.Dragging
    const handler = getHandler(DragMoveEvent)

    handler(moveEvent(1, 1))
    expect(scrollAnimateMock).toHaveBeenCalledTimes(2)
    expect(scrollAnimateMock.mock.calls[0][0]).toBe(viewport.scrollContainer)
    expect(scrollAnimateMock.mock.calls[0][1]).toBe('x')
    const firstStops = scrollAnimateMock.mock.results.map(result => result.value)

    handler(moveEvent(1, 1))
    firstStops.forEach(stop => expect(stop).toHaveBeenCalled())
    expect(scrollAnimateMock).toHaveBeenCalledTimes(4)

    handler(moveEvent(50, 50))
    scrollAnimateMock.mock.results.slice(2).forEach(result => {
      expect(result.value).toHaveBeenCalled()
    })
    expect(scrollAnimateMock).toHaveBeenCalledTimes(4)
  })

  it('光标不在拖拽状态时不启动动画', () => {
    const { getHandler, moveEvent } = createHarness()

    getHandler(DragMoveEvent)(moveEvent(1, 1))

    expect(scrollAnimateMock).not.toHaveBeenCalled()
  })

  it('在大纲视口内拖拽时使用大纲滚动容器', () => {
    const { cursor, viewport, outline, getHandler, moveEvent } = createHarness()
    cursor.status = CursorStatus.Dragging
    outline.isPointInViewport.mockReturnValue(true)

    getHandler(DragMoveEvent)(moveEvent(1, 1))

    expect(outline.isPointInViewport).toHaveBeenCalled()
    expect(viewport.isPointInViewport).not.toHaveBeenCalled()
    expect(scrollAnimateMock.mock.calls[0][0]).toBe(outline.scrollContainer)
  })

  it('拖拽结束时停止动画', () => {
    const { cursor, getHandler, moveEvent } = createHarness()
    cursor.status = CursorStatus.Dragging
    getHandler(DragMoveEvent)(moveEvent(1, 1))
    const stops = scrollAnimateMock.mock.results.map(result => result.value)

    getHandler(DragStopEvent)(new DragStopEvent({ target: null, clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))

    stops.forEach(stop => expect(stop).toHaveBeenCalled())
  })
})
