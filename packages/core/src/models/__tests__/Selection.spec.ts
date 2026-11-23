import { describe, expect, it, vi } from 'vitest'

import { createDesigner } from '../../__tests__/helpers'
import { TreeNode } from '../TreeNode'

const createSelectionFixture = () => {
  const { engine, workspace } = createDesigner()
  const tree = workspace.operation.tree
  const a = new TreeNode({ componentName: 'A', props: {} })
  const b = new TreeNode({ componentName: 'B', props: {} })
  const c = new TreeNode({ componentName: 'C', props: {} })
  tree.append(a, b, c)
  return { engine, workspace, tree, a, b, c, selection: workspace.operation.selection }
}

describe('Selection', () => {
  it('select / add / remove / clear 维护选中状态', () => {
    const { a, b, selection } = createSelectionFixture()

    selection.select(a)
    expect(selection.selected).toEqual([a.id])
    expect(selection.indexes[a.id]).toBe(true)
    expect(selection.first).toBe(a.id)
    expect(selection.last).toBe(a.id)
    expect(selection.length).toBe(1)

    selection.add(b)
    expect(selection.selected).toEqual([a.id, b.id])
    expect(selection.has(a)).toBe(true)
    expect(selection.has(b)).toBe(true)
    expect(selection.selectedNodes).toEqual([a, b])

    selection.remove(a)
    expect(selection.selected).toEqual([b.id])
    expect(selection.has(a)).toBe(false)
    expect(selection.first).toBe(b.id)

    selection.clear()
    expect(selection.selected).toEqual([])
    expect(selection.indexes).toEqual({})
    expect(selection.selectedNodes).toEqual([])
  })

  it('batchSelect 批量选中并同步 indexes', () => {
    const { a, b, c, selection } = createSelectionFixture()

    selection.batchSelect([a, b, c])

    expect(selection.selected).toEqual([a.id, b.id, c.id])
    expect(selection.indexes).toEqual({ [a.id]: true, [b.id]: true, [c.id]: true })
    expect(selection.selectedNodes).toEqual([a, b, c])
  })

  it('safeSelect / batchSafeSelect 忽略空值', () => {
    const { a, selection } = createSelectionFixture()

    selection.select(a)
    selection.safeSelect(undefined as any)
    selection.batchSafeSelect([])

    expect(selection.selected).toEqual([a.id])
  })

  it('支持按 id 选中', () => {
    const { tree, a, selection } = createSelectionFixture()

    selection.select(tree.id)
    expect(selection.selected).toEqual([tree.id])
    expect(selection.selectedNodes).toEqual([tree])

    selection.select(a.id)
    expect(selection.selected).toEqual([a.id])
  })

  it('重复选中同一节点仍会触发选中事件', () => {
    const { workspace, a, selection } = createSelectionFixture()
    const dispatch = vi.spyOn(workspace.operation, 'dispatch')

    selection.select(a)
    dispatch.mockClear()
    selection.select(a.id)

    expect(selection.selected).toEqual([a.id])
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('crossAddTo 选中区间节点，重复调用则移除', () => {
    const { a, b, c, selection } = createSelectionFixture()

    selection.select(a)
    selection.crossAddTo(c)
    expect(selection.selected).toEqual([a.id, b.id, c.id])

    selection.crossAddTo(c)
    expect(selection.selected).toEqual([a.id, b.id])

    const orphan = new TreeNode({ componentName: 'Orphan', props: {} })
    selection.crossAddTo(orphan)
    expect(selection.has(orphan)).toBe(false)
  })

  it('engine.getAllSelectedNodes 汇总所有工作区的选中节点', () => {
    const { engine, a, selection } = createSelectionFixture()

    selection.select(a)

    expect(engine.getAllSelectedNodes()).toEqual([a])
  })
})
