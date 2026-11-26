import { describe, expect, it, vi } from 'vitest'

import { Cursor, CursorDragType, CursorStatus, CursorType } from '../Cursor'

const createEngine = () => {
  const workspaces: any[] = []
  const eachWorkspace = vi.fn((visitor: (workspace: any) => void) => workspaces.forEach(visitor))
  const engine: any = {
    workbench: {
      eachWorkspace,
    },
  }
  return { engine, workspaces, eachWorkspace }
}

describe('Cursor', () => {
  it('setStatus / setType / setDragType 更新状态', () => {
    const { engine } = createEngine()
    const cursor = new Cursor(engine)

    cursor.setStatus(CursorStatus.Dragging)
    cursor.setType(CursorType.Selection)
    cursor.setDragType(CursorDragType.Resize)

    expect(cursor.status).toBe(CursorStatus.Dragging)
    expect(cursor.type).toBe(CursorType.Selection)
    expect(cursor.dragType).toBe(CursorDragType.Resize)

    cursor.setStatus(CursorStatus.Normal)
  })

  it('拖拽期间禁用文本选择并清除已有选择，回到 Normal 后恢复', () => {
    const { engine, workspaces } = createEngine()
    const removeAllRanges = vi.fn()
    const contentRoot = { style: {} as any }
    workspaces.push({
      viewport: {
        contentWindow: {
          document: { documentElement: contentRoot },
          getSelection: () => ({ removeAllRanges }),
        },
      },
    })
    const cursor = new Cursor(engine)

    cursor.setStatus(CursorStatus.DragStart)

    expect(document.documentElement.style.userSelect).toBe('none')
    expect(contentRoot.style.userSelect).toBe('none')
    expect(removeAllRanges).toHaveBeenCalled()

    cursor.setStatus(CursorStatus.Normal)

    expect(document.documentElement.style.userSelect).toBe('')
    expect(contentRoot.style.userSelect).toBe('')
  })

  it('setStyle 同步光标到画布与当前文档根节点', () => {
    const { engine, workspaces, eachWorkspace } = createEngine()
    const root = { style: { cursor: '' } }
    workspaces.push({
      viewport: {
        contentWindow: {
          document: {
            getElementsByTagName: () => [root],
          },
        },
      },
    })
    const cursor = new Cursor(engine)

    cursor.setStyle('crosshair')

    expect(root.style.cursor).toBe('crosshair')
    expect(document.documentElement.style.cursor).toBe('crosshair')

    cursor.setStyle()
    expect(eachWorkspace).toHaveBeenCalledTimes(1)
  })

  it('speed 根据 dragAtomDelta 计算移动速度', () => {
    const { engine } = createEngine()
    const cursor = new Cursor(engine)

    cursor.dragAtomDelta = { clientX: 3, clientY: 4 }

    expect(cursor.speed).toBe(5)
  })

  it('setPosition 仅在 Dragging 状态同步拖拽起点增量', () => {
    const { engine } = createEngine()
    const cursor = new Cursor(engine)

    cursor.setDragStartPosition({ clientX: 10, clientY: 10 })
    cursor.setPosition({ clientX: 5, clientY: 6 })

    expect(cursor.position).toEqual({ clientX: 5, clientY: 6 })
    expect(cursor.dragAtomDelta).toEqual({
      pageX: 0,
      pageY: 0,
      clientX: -5,
      clientY: -6,
      topPageX: 0,
      topPageY: 0,
      topClientX: 0,
      topClientY: 0,
    })
    expect(cursor.dragStartToCurrentDelta).toEqual({
      pageX: 0,
      pageY: 0,
      clientX: 0,
      clientY: 0,
      topPageX: 0,
      topPageY: 0,
      topClientX: 0,
      topClientY: 0,
    })

    cursor.setStatus(CursorStatus.Dragging)
    cursor.setPosition({ clientX: 15, clientY: 20 })

    expect(cursor.dragStartToCurrentDelta).toEqual({ clientX: 5, clientY: 10 })
  })

  it('setDragStartPosition 支持写入与清空', () => {
    const { engine } = createEngine()
    const cursor = new Cursor(engine)

    cursor.setDragStartPosition({ clientX: 1, clientY: 2 })
    expect(cursor.dragStartPosition).toEqual({ clientX: 1, clientY: 2 })

    cursor.setDragStartPosition(null)
    expect(cursor.dragStartPosition).toBeUndefined()
    expect(cursor.dragStartToCurrentDelta).toEqual({
      pageX: 0,
      pageY: 0,
      clientX: 0,
      clientY: 0,
      topPageX: 0,
      topPageY: 0,
      topClientX: 0,
      topClientY: 0,
    })

    cursor.setDragStartPosition({ clientX: 3, clientY: 4 })
    cursor.setDragStartPosition()
    expect(cursor.dragStartPosition).toBeUndefined()
  })

  it('setDragEndPosition 依赖拖拽起点并维护增量', () => {
    const { engine } = createEngine()
    const cursor = new Cursor(engine)

    cursor.setDragEndPosition({ clientX: 10, clientY: 10 })
    expect(cursor.dragEndPosition).toBeUndefined()

    cursor.setDragStartPosition({ clientX: 2, clientY: 3 })
    cursor.setDragEndPosition({ clientX: 7, clientY: 9 })

    expect(cursor.dragEndPosition).toEqual({ clientX: 7, clientY: 9 })
    expect(cursor.dragStartToEndDelta).toEqual({ clientX: -5, clientY: -6 })

    cursor.setDragEndPosition()

    expect(cursor.dragEndPosition).toBeUndefined()
    expect(cursor.dragStartToEndDelta).toEqual({
      pageX: 0,
      pageY: 0,
      clientX: 0,
      clientY: 0,
      topPageX: 0,
      topPageY: 0,
      topClientX: 0,
      topClientY: 0,
    })
  })
})
