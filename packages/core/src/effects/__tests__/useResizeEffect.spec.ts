import { afterEach, describe, expect, it, vi } from 'vitest'

// 先加载 registry 以固定模块求值顺序，避免 models 与 shortcuts 之间的循环依赖
import '../../registry'
import { DragMoveEvent } from '../../events/cursor/DragMoveEvent'
import { DragStartEvent } from '../../events/cursor/DragStartEvent'
import { DragStopEvent } from '../../events/cursor/DragStopEvent'
import { CursorDragType } from '../../models/Cursor'
import { useResizeEffect } from '../useResizeEffect'

const createEngine = () => {
  const transformHelper: any = {
    dragNodes: [] as any[],
    dragStart: vi.fn(),
    dragMove: vi.fn(),
    dragEnd: vi.fn(),
    resize: vi.fn((node: any, visitor: (rect: any) => void) => {
      visitor({ width: 120, height: 80, x: 5, y: 6 })
    }),
  }
  const workspace: any = { operation: { transformHelper } }
  const handlers = new Map<any, (event: any) => void>()
  const engine: any = {
    props: {
      nodeResizeHandlerAttrName: 'data-node-resize-handler',
      nodeSelectionIdAttrName: 'data-node-selection-id',
    },
    cursor: { dragType: CursorDragType.Resize },
    workbench: { activeWorkspace: workspace },
    findNodeById: vi.fn(),
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      handlers.set(type, handler)
    }),
  }
  useResizeEffect(engine)
  const getHandler = (type: any) => handlers.get(type) as (event: any) => void
  const createEvent = (Type: any, target: EventTarget | null, context?: any) => {
    const event = new Type({ target, clientX: 0, clientY: 0, pageX: 0, pageY: 0 })
    ;(event as any).context = context
    return event
  }
  return { engine, workspace, transformHelper, getHandler, createEvent }
}

const createResizeHandler = (attrs: Record<string, string> = {}) => {
  const wrapper = document.createElement('div')
  Object.entries(attrs).forEach(([key, value]) => wrapper.setAttribute(key, value))
  const handler = document.createElement('div')
  handler.setAttribute('data-node-resize-handler', 'bottom-right')
  const leaf = document.createElement('span')
  handler.appendChild(leaf)
  wrapper.appendChild(handler)
  document.body.appendChild(wrapper)
  return { wrapper, handler, leaf }
}

describe('useResizeEffect', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('拖拽缩放手柄时按选中节点启动缩放', () => {
    const { engine, transformHelper, getHandler, createEvent } = createEngine()
    const node = { id: 'node-1' }
    engine.findNodeById.mockReturnValue(node)
    const { leaf } = createResizeHandler({ 'data-node-selection-id': 'node-1' })

    getHandler(DragStartEvent)(createEvent(DragStartEvent, leaf))

    expect(engine.findNodeById).toHaveBeenCalledWith('node-1')
    expect(transformHelper.dragStart).toHaveBeenCalledWith({
      dragNodes: [node],
      type: 'resize',
      direction: 'bottom-right',
    })
  })

  it('缺少工作区、手柄、方向或节点时不启动缩放', () => {
    const { engine, workspace, transformHelper, getHandler, createEvent } = createEngine()
    const handler = getHandler(DragStartEvent)
    const { leaf } = createResizeHandler({ 'data-node-selection-id': 'node-1' })

    engine.workbench.activeWorkspace = undefined
    handler(createEvent(DragStartEvent, leaf))
    engine.workbench.activeWorkspace = workspace

    handler(createEvent(DragStartEvent, document.createElement('div')))

    const withoutDirection = document.createElement('div')
    withoutDirection.setAttribute('data-node-resize-handler', '')
    document.body.appendChild(withoutDirection)
    handler(createEvent(DragStartEvent, withoutDirection))

    const withoutSelection = document.createElement('div')
    withoutSelection.setAttribute('data-node-resize-handler', 'bottom-right')
    document.body.appendChild(withoutSelection)
    handler(createEvent(DragStartEvent, withoutSelection))

    const { leaf: leafWithoutSelection } = createResizeHandler()
    handler(createEvent(DragStartEvent, leafWithoutSelection))

    engine.findNodeById.mockReturnValue(undefined)
    handler(createEvent(DragStartEvent, leaf))

    expect(transformHelper.dragStart).not.toHaveBeenCalled()
  })

  it('拖拽类型不是缩放时忽略移动与结束', () => {
    const { engine, transformHelper, getHandler, createEvent } = createEngine()
    engine.cursor.dragType = CursorDragType.Move

    getHandler(DragMoveEvent)(createEvent(DragMoveEvent, null))
    getHandler(DragStopEvent)(createEvent(DragStopEvent, null))

    expect(transformHelper.dragMove).not.toHaveBeenCalled()
    expect(transformHelper.dragEnd).not.toHaveBeenCalled()
  })

  it('缩放拖拽移动时更新节点元素的尺寸与位置', () => {
    const { workspace, transformHelper, getHandler, createEvent } = createEngine()
    const element = document.createElement('div')
    const node: any = { id: 'node-1', getElement: () => element }
    const emptyNode: any = { id: 'node-2', getElement: () => null }
    transformHelper.dragNodes = [node, emptyNode]

    getHandler(DragMoveEvent)(createEvent(DragMoveEvent, null, { workspace }))

    expect(transformHelper.dragMove).toHaveBeenCalled()
    expect(transformHelper.resize).toHaveBeenCalledTimes(1)
    expect(element.style.width).toBe('120px')
    expect(element.style.height).toBe('80px')
    expect(element.style.position).toBe('absolute')
    expect(element.style.left).toBe('0px')
    expect(element.style.top).toBe('0px')
    expect(element.style.transform).toBe('translate3d(5px,6px,0)')
  })

  it('没有拖拽节点或工作区时跳过移动', () => {
    const { engine, workspace, transformHelper, getHandler, createEvent } = createEngine()

    getHandler(DragMoveEvent)(createEvent(DragMoveEvent, null))
    engine.workbench.activeWorkspace = undefined
    getHandler(DragMoveEvent)(createEvent(DragMoveEvent, null))
    engine.workbench.activeWorkspace = workspace
    getHandler(DragMoveEvent)(createEvent(DragMoveEvent, null, { workspace }))

    expect(transformHelper.dragMove).not.toHaveBeenCalled()
  })

  it('缩放结束后重置辅助器，缺少工作区不报错', () => {
    const { engine, workspace, transformHelper, getHandler, createEvent } = createEngine()

    getHandler(DragStopEvent)(createEvent(DragStopEvent, null, { workspace }))
    expect(transformHelper.dragEnd).toHaveBeenCalled()

    engine.workbench.activeWorkspace = undefined
    expect(() => getHandler(DragStopEvent)(createEvent(DragStopEvent, null))).not.toThrow()
  })
})
