import { afterEach, describe, expect, it, vi } from 'vitest'

// 先加载 registry 以固定模块求值顺序，避免 models 与 shortcuts 之间的循环依赖
import '../../registry'
import { DragMoveEvent } from '../../events/cursor/DragMoveEvent'
import { DragStartEvent } from '../../events/cursor/DragStartEvent'
import { DragStopEvent } from '../../events/cursor/DragStopEvent'
import { CursorDragType } from '../../models/Cursor'
import { useTranslateEffect } from '../useTranslateEffect'

const createEngine = () => {
  const transformHelper: any = {
    dragNodes: [] as any[],
    dragStart: vi.fn(),
    dragMove: vi.fn(),
    dragEnd: vi.fn(),
    translate: vi.fn((node: any, visitor: (translate: { x: number; y: number }) => void) => {
      visitor({ x: 12, y: 34 })
    }),
  }
  const workspace: any = { operation: { transformHelper } }
  const handlers = new Map<any, (event: any) => void>()
  const engine: any = {
    props: {
      nodeTranslateAttrName: 'data-node-translate',
      nodeSelectionIdAttrName: 'data-node-selection-id',
    },
    cursor: { dragType: CursorDragType.Translate },
    workbench: { activeWorkspace: workspace },
    findNodeById: vi.fn(),
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      handlers.set(type, handler)
    }),
  }
  useTranslateEffect(engine)
  const getHandler = (type: any) => handlers.get(type) as (event: any) => void
  const dragStartEvent = (target: EventTarget | null, context?: any) => {
    const event = new DragStartEvent({ target, clientX: 0, clientY: 0, pageX: 0, pageY: 0 })
    ;(event as any).context = context
    return event
  }
  const dragMoveEvent = (context?: any) => {
    const event = new DragMoveEvent({ target: null, clientX: 0, clientY: 0, pageX: 0, pageY: 0 })
    ;(event as any).context = context
    return event
  }
  const dragStopEvent = (context?: any) => {
    const event = new DragStopEvent({ target: null, clientX: 0, clientY: 0, pageX: 0, pageY: 0 })
    ;(event as any).context = context
    return event
  }
  return {
    engine,
    workspace,
    transformHelper,
    getHandler,
    dragStartEvent,
    dragMoveEvent,
    dragStopEvent,
  }
}

const createTranslateHandler = (attrs: Record<string, string> = {}) => {
  const wrapper = document.createElement('div')
  Object.entries(attrs).forEach(([key, value]) => wrapper.setAttribute(key, value))
  const handler = document.createElement('div')
  handler.setAttribute('data-node-translate', 'translate')
  wrapper.appendChild(handler)
  document.body.appendChild(wrapper)
  const leaf = document.createElement('span')
  handler.appendChild(leaf)
  return { wrapper, handler, leaf }
}

describe('useTranslateEffect', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('拖拽平移手柄时按选中节点启动平移', () => {
    const { engine, workspace, transformHelper, getHandler, dragStartEvent } = createEngine()
    const node = { id: 'node-1' }
    engine.findNodeById.mockReturnValue(node)
    const { leaf } = createTranslateHandler({ 'data-node-selection-id': 'node-1' })

    getHandler(DragStartEvent)(dragStartEvent(leaf))

    expect(engine.findNodeById).toHaveBeenCalledWith('node-1', workspace)
    expect(transformHelper.dragStart).toHaveBeenCalledWith({ dragNodes: [node], type: 'translate' })
  })

  it('缺少工作区、手柄、类型或选中节点时不启动平移', () => {
    const { engine, workspace, transformHelper, getHandler, dragStartEvent } = createEngine()
    const handler = getHandler(DragStartEvent)
    const { leaf } = createTranslateHandler({ 'data-node-selection-id': 'node-1' })

    engine.workbench.activeWorkspace = undefined
    handler(dragStartEvent(leaf))
    engine.workbench.activeWorkspace = workspace

    handler(dragStartEvent(document.createElement('div')))

    const withoutType = document.createElement('div')
    withoutType.setAttribute('data-node-translate', '')
    document.body.appendChild(withoutType)
    handler(dragStartEvent(withoutType))

    const withoutSelection = document.createElement('div')
    withoutSelection.setAttribute('data-node-translate', 'translate')
    document.body.appendChild(withoutSelection)
    handler(dragStartEvent(withoutSelection))

    const { leaf: leafWithSelection } = createTranslateHandler()
    handler(dragStartEvent(leafWithSelection))

    engine.findNodeById.mockReturnValue(undefined)
    handler(dragStartEvent(leaf))

    expect(transformHelper.dragStart).not.toHaveBeenCalled()
  })

  it('拖拽类型不是平移时忽略移动与结束', () => {
    const { engine, transformHelper, getHandler, dragMoveEvent, dragStopEvent } = createEngine()
    engine.cursor.dragType = CursorDragType.Move

    getHandler(DragMoveEvent)(dragMoveEvent())
    getHandler(DragStopEvent)(dragStopEvent())

    expect(transformHelper.dragMove).not.toHaveBeenCalled()
    expect(transformHelper.dragEnd).not.toHaveBeenCalled()
  })

  it('平移拖拽移动时更新节点元素的 transform', () => {
    const { workspace, transformHelper, getHandler, dragMoveEvent } = createEngine()
    const element = document.createElement('div')
    const node: any = { id: 'node-1', getElement: () => element }
    const emptyNode: any = { id: 'node-2', getElement: () => null }
    transformHelper.dragNodes = [node, emptyNode]

    getHandler(DragMoveEvent)(dragMoveEvent({ workspace }))

    expect(transformHelper.dragMove).toHaveBeenCalled()
    expect(transformHelper.translate).toHaveBeenCalledWith(node, expect.any(Function))
    expect(transformHelper.translate).toHaveBeenCalledTimes(1)
    expect(element.style.position).toBe('absolute')
    expect(element.style.left).toBe('0px')
    expect(element.style.top).toBe('0px')
    expect(element.style.transform).toBe('translate3d(12px,34px,0)')
  })

  it('没有拖拽节点或工作区时跳过移动', () => {
    const { engine, workspace, transformHelper, getHandler, dragMoveEvent } = createEngine()

    getHandler(DragMoveEvent)(dragMoveEvent())
    engine.workbench.activeWorkspace = undefined
    getHandler(DragMoveEvent)(dragMoveEvent())

    engine.workbench.activeWorkspace = workspace
    transformHelper.dragNodes = []
    getHandler(DragMoveEvent)(dragMoveEvent({ workspace }))

    engine.workbench.activeWorkspace = undefined
    transformHelper.dragNodes = [{ id: 'node-1', getElement: () => null }]
    getHandler(DragMoveEvent)(dragMoveEvent())

    expect(transformHelper.dragMove).not.toHaveBeenCalled()
  })

  it('平移拖拽结束后重置辅助器', () => {
    const { workspace, transformHelper, getHandler, dragStopEvent } = createEngine()

    getHandler(DragStopEvent)(dragStopEvent({ workspace }))
    expect(transformHelper.dragEnd).toHaveBeenCalled()
  })

  it('拖拽结束时缺少工作区不报错', () => {
    const { engine, getHandler, dragStopEvent } = createEngine()
    engine.workbench.activeWorkspace = undefined

    expect(() => getHandler(DragStopEvent)(dragStopEvent())).not.toThrow()
  })
})
