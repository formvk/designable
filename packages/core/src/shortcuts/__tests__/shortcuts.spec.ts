import { describe, expect, it, vi } from 'vitest'

import { CopyNodes, DeleteNodes, PasteNodes, SelectAllNodes } from '..'
import { createDesigner } from '../../__tests__/helpers'
import { TreeNode } from '../../models/TreeNode'
import { RedoMutation, UndoMutation } from '../UndoRedo'

const behaviors = {
  test: {
    Behavior: [
      {
        name: 'DroppableRoot',
        selector: (node: any) => node.componentName === 'Root',
        designerProps: { droppable: true },
      },
    ],
  },
}

const createTestDesigner = (id?: string) => {
  const result = createDesigner(id)
  result.engine.registry.registerDesignerBehaviors(behaviors)
  return result
}

describe('NodeMutation 快捷键', () => {
  it('DeleteNodes 删除选中节点并回选相邻节点', async () => {
    const { workspace } = createTestDesigner()
    const tree = workspace.operation.tree
    const a = new TreeNode({ componentName: 'A', props: {} })
    const b = new TreeNode({ componentName: 'B', props: {} })
    await tree.append(a, b)
    workspace.operation.selection.select(b)

    await DeleteNodes.handler!({ workspace } as any)

    expect(tree.children).toEqual([a])
    expect(workspace.operation.selection.first).toBe(a.id)

    expect(await DeleteNodes.handler!({} as any)).toBeUndefined()
  })

  it('CopyNodes / PasteNodes 复制并粘贴选中节点', async () => {
    const { workspace } = createTestDesigner()
    const tree = workspace.operation.tree
    const a = new TreeNode({ componentName: 'A', props: { value: 1 } })
    await tree.append(a)
    workspace.operation.selection.select(a)

    await CopyNodes.handler!({ workspace } as any)
    await PasteNodes.handler!({ workspace } as any)

    expect(tree.children).toHaveLength(2)
    expect(tree.children[1]).not.toBe(a)
    expect(tree.children[1].componentName).toBe('A')

    expect(await CopyNodes.handler!({} as any)).toBeUndefined()
    expect(await PasteNodes.handler!({} as any)).toBeUndefined()
  })
})

describe('UndoRedo 快捷键', () => {
  it('UndoMutation / RedoMutation 调用历史并清理 hover', async () => {
    const { workspace } = createTestDesigner()
    const undo = vi.spyOn(workspace.history, 'undo')
    const redo = vi.spyOn(workspace.history, 'redo')
    const clear = vi.spyOn(workspace.operation.hover, 'clear')

    await UndoMutation.handler!({ workspace } as any)
    expect(undo).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledTimes(1)

    await RedoMutation.handler!({ workspace } as any)
    expect(redo).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledTimes(2)

    expect(await UndoMutation.handler!({} as any)).toBeUndefined()
    expect(await RedoMutation.handler!(undefined as any)).toBeUndefined()
  })
})

describe('SelectAllNodes 快捷键', () => {
  it('选中根节点下所有后代', async () => {
    const { workspace } = createTestDesigner()
    const tree = workspace.operation.tree
    const a = new TreeNode({ componentName: 'A', props: {} })
    const b = new TreeNode({ componentName: 'B', props: {} })
    await tree.append(a)
    await a.append(b)

    SelectAllNodes.handler!({ workspace } as any)

    expect(workspace.operation.selection.selected).toEqual([a.id, b.id])

    expect(SelectAllNodes.handler!({} as any)).toBeUndefined()
  })
})
