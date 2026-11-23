import { KeyCode } from '@formvk/designable-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'

// 先加载 registry 以固定模块求值顺序，避免 models 与 shortcuts 之间的循环依赖
import '../../registry'
import { MouseClickEvent } from '../../events/cursor/MouseClickEvent'
import { CursorStatus } from '../../models/Cursor'
import { useSelectionEffect } from '../useSelectionEffect'

const createEngine = () => {
  const tree = { findById: vi.fn() }
  const selection: any = {
    selected: [] as any[],
    has: vi.fn(() => false),
    add: vi.fn(),
    remove: vi.fn(),
    crossAddTo: vi.fn(),
    select: vi.fn(),
  }
  const keyboard = { requestClean: vi.fn(), isKeyDown: vi.fn((_code?: any) => false) }
  const viewport = { isPointInViewport: vi.fn(() => true) }
  const outline = { isPointInViewport: vi.fn(() => false) }
  const workspace: any = {
    operation: { tree, selection },
    viewport,
    outline,
  }
  const handlers = new Map<any, (event: any) => void>()
  const cursor: any = { status: CursorStatus.Normal }
  const engine: any = {
    props: {
      nodeIdAttrName: 'data-node-id',
      outlineNodeIdAttrName: 'data-outline-node-id',
      nodeSelectionIdAttrName: 'data-node-selection-id',
    },
    cursor,
    keyboard,
    workbench: { activeWorkspace: workspace },
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      handlers.set(type, handler)
    }),
  }
  useSelectionEffect(engine)
  const getHandler = () => handlers.get(MouseClickEvent) as (event: any) => void
  const click = (target: EventTarget | null, context?: any) => {
    const event = new MouseClickEvent({ target, clientX: 10, clientY: 20, pageX: 10, pageY: 20 })
    ;(event as any).context = context
    return event
  }
  return { engine, cursor, tree, selection, keyboard, viewport, outline, workspace, getHandler, click }
}

const createElement = (attrs: Record<string, string> = {}) => {
  const element = document.createElement('div')
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value))
  const child = document.createElement('span')
  element.appendChild(child)
  document.body.appendChild(element)
  return child
}

describe('useSelectionEffect', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('非普通光标状态忽略点击', () => {
    const { cursor, selection, getHandler, click } = createEngine()
    cursor.status = CursorStatus.Dragging

    getHandler()(click(createElement({ 'data-node-id': 'node-1' })))

    expect(selection.select).not.toHaveBeenCalled()
  })

  it('缺少工作区时忽略点击', () => {
    const { engine, selection, getHandler, click } = createEngine()
    engine.workbench.activeWorkspace = undefined

    getHandler()(click(createElement({ 'data-node-id': 'node-1' })))

    expect(selection.select).not.toHaveBeenCalled()
  })

  it('点击视口空白区域时选中根节点', () => {
    const { tree, selection, getHandler, click } = createEngine()

    getHandler()(click(createElement()))

    expect(selection.select).toHaveBeenCalledWith(tree)
  })

  it('点击视口外空白区域不选中，点击操作手柄不选中', () => {
    const { viewport, outline, selection, getHandler, click } = createEngine()
    viewport.isPointInViewport.mockReturnValue(false)
    outline.isPointInViewport.mockReturnValue(false)

    getHandler()(click(createElement()))
    expect(selection.select).not.toHaveBeenCalled()

    viewport.isPointInViewport.mockReturnValue(true)
    getHandler()(click(createElement({ 'data-node-selection-id': 'node-1' })))
    expect(selection.select).not.toHaveBeenCalled()
  })

  it('点击节点时普通选中并清理键盘缓存', () => {
    const { tree, selection, keyboard, getHandler, click } = createEngine()
    const node = { id: 'node-1' }
    tree.findById.mockReturnValue(node)

    getHandler()(click(createElement({ 'data-node-id': 'node-1' })))

    expect(keyboard.requestClean).toHaveBeenCalled()
    expect(selection.select).toHaveBeenCalledWith(node)
  })

  it('Meta 或 Control 按下时追加或移除选中项', () => {
    const { tree, selection, keyboard, getHandler, click } = createEngine()
    const node = { id: 'node-1' }
    tree.findById.mockReturnValue(node)
    keyboard.isKeyDown.mockImplementation((code: any) => code === KeyCode.Meta || code === KeyCode.Control)
    const handler = getHandler()
    const target = createElement({ 'data-node-id': 'node-1' })

    handler(click(target))
    expect(selection.add).toHaveBeenCalledWith(node)

    selection.has.mockReturnValue(true)
    selection.selected = [node]
    handler(click(target))
    expect(selection.remove).not.toHaveBeenCalled()

    selection.selected = [node, { id: 'node-2' }]
    handler(click(target))
    expect(selection.remove).toHaveBeenCalledWith(node)
  })

  it('Shift 按下时跨级追加或移除选中项', () => {
    const { tree, selection, keyboard, getHandler, click } = createEngine()
    const node = { id: 'node-1' }
    tree.findById.mockReturnValue(node)
    keyboard.isKeyDown.mockImplementation((code: any) => code === KeyCode.Shift)
    const handler = getHandler()
    const target = createElement({ 'data-node-id': 'node-1' })

    handler(click(target))
    expect(selection.crossAddTo).toHaveBeenCalledWith(node)

    selection.has.mockReturnValue(true)
    selection.selected = [node, { id: 'node-2' }]
    handler(click(target))
    expect(selection.remove).toHaveBeenCalledWith(node)
  })

  it('点击 outline 节点或节点不存在时的处理', () => {
    const { tree, selection, getHandler, click } = createEngine()
    const node = { id: 'node-1' }
    tree.findById.mockReturnValue(node)

    getHandler()(click(createElement({ 'data-outline-node-id': 'node-1' })))
    expect(tree.findById).toHaveBeenCalledWith('node-1')
    expect(selection.select).toHaveBeenCalledWith(node)

    selection.select.mockClear()
    tree.findById.mockReturnValue(undefined)
    getHandler()(click(createElement({ 'data-node-id': 'missing' })))
    expect(selection.select).toHaveBeenCalledWith(tree)
  })

  it('节点标记为空时不处理', () => {
    const { tree, selection, getHandler, click } = createEngine()

    getHandler()(click(createElement({ 'data-node-id': '' })))

    expect(tree.findById).not.toHaveBeenCalled()
    expect(selection.select).not.toHaveBeenCalled()
  })
})
