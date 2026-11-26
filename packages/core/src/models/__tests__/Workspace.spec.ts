import { describe, expect, it, vi } from 'vitest'

import { createDesigner } from '../../__tests__/helpers'
import { HistoryGotoEvent, HistoryPushEvent, HistoryRedoEvent, HistoryUndoEvent } from '../../events'

describe('Workspace', () => {
  it('构造后初始化视口 / 轮廓 / 操作与历史', () => {
    const { engine, workspace } = createDesigner('w1')

    expect(workspace.id).toBe('w1')
    expect(workspace.title).toBe('测试工作区')
    expect(workspace.description).toBe('单元测试')
    expect(workspace.viewport.workspace).toBe(workspace)
    expect(workspace.viewport.moveSensitive).toBe(true)
    expect(workspace.viewport.nodeIdAttrName).toBe('data-designer-node-id')
    expect(workspace.outline.workspace).toBe(workspace)
    expect(workspace.outline.moveSensitive).toBe(false)
    expect(workspace.outline.moveInsertionType).toBe('block')
    expect(workspace.outline.nodeIdAttrName).toBe('data-designer-outline-node-id')
    expect(workspace.operation.workspace).toBe(workspace)
    expect(workspace.operation.selection.first).toBe(workspace.operation.tree.id)
    expect(workspace.history.context).toBe(workspace)
    expect(workspace.history.history).toHaveLength(1)
    expect(engine.workbench.currentWorkspace).toBe(workspace)
  })

  it('getEventContext 提供完整的引擎上下文', () => {
    const { engine, workspace } = createDesigner()

    expect(workspace.getEventContext()).toEqual({
      workbench: engine.workbench,
      workspace,
      engine,
      viewport: workspace.viewport,
    })
  })

  it('dispatch 交给 engine 并携带上下文', () => {
    const { engine, workspace } = createDesigner()
    const dispatch = vi.spyOn(engine, 'dispatch').mockReturnValue(true)
    const event = { type: 'custom:event' }

    workspace.dispatch(event)

    expect(dispatch).toHaveBeenCalledWith(event, workspace.getEventContext())
  })

  it('attachEvents / detachEvents 代理到 engine', () => {
    const { engine, workspace } = createDesigner()
    const attachEvents = vi.spyOn(engine, 'attachEvents').mockImplementation(() => {})
    const detachEvents = vi.spyOn(engine, 'detachEvents').mockImplementation(() => {})
    const container = workspace.viewport.viewportElement

    workspace.attachEvents(container, window)
    expect(attachEvents).toHaveBeenCalledWith(container, window, workspace.getEventContext())

    workspace.detachEvents(container)
    expect(detachEvents).toHaveBeenCalledWith(container)
  })

  it('serialize / from 双向同步工作区数据', async () => {
    const { workspace } = createDesigner('w1')
    workspace.title = '标题'
    workspace.description = '描述'

    const data = await workspace.serialize()

    expect(data.id).toBe('w1')
    expect(data.title).toBe('标题')
    expect(data.description).toBe('描述')
    expect(data.operation?.selected).toEqual([workspace.operation.tree.id])

    const { workspace: target } = createDesigner('w2')
    await target.from(data)

    expect(target.id).toBe('w1')
    expect(target.title).toBe('标题')
    expect(target.description).toBe('描述')
    expect(target.operation.selection.selected).toEqual([workspace.operation.tree.id])

    await target.from(undefined)
    expect(target.id).toBe('w1')

    expect(workspace.serializeSync()).toMatchObject({ id: 'w1', title: '标题', description: '描述' })
  })

  it('历史回调派发对应事件并清理 hover', async () => {
    const { workspace } = createDesigner()
    const dispatch = vi.spyOn(workspace.operation, 'dispatch')
    const clear = vi.spyOn(workspace.operation.hover, 'clear')

    await workspace.history.push('custom')
    expect(dispatch).toHaveBeenCalledWith(expect.any(HistoryPushEvent))

    await workspace.history.undo()
    expect(clear).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith(expect.any(HistoryUndoEvent))

    await workspace.history.redo()
    expect(clear).toHaveBeenCalledTimes(2)
    expect(dispatch).toHaveBeenCalledWith(expect.any(HistoryRedoEvent))

    await workspace.history.goTo(0)
    expect(clear).toHaveBeenCalledTimes(3)
    expect(dispatch).toHaveBeenCalledWith(expect.any(HistoryGotoEvent))
  })
})
