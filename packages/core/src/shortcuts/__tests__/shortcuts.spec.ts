import { beforeAll, describe, expect, it, vi } from 'vitest'

// 先加载 registry 以固定模块求值顺序，避免 models 与 shortcuts 之间的循环依赖
import '../../registry'
import { CopyNodes, DeleteNodes, PasteNodes, SelectAllNodes } from '..'
import { createDesigner } from '../../__tests__/helpers'
import { TreeNode } from '../../models/TreeNode'
import { GlobalRegistry } from '../../registry'
import { RedoMutation, UndoMutation } from '../UndoRedo'

beforeAll(() => {
  GlobalRegistry.registerDesignerBehaviors({
    test: {
      Behavior: [
        {
          name: 'DroppableRoot',
          selector: (node: any) => node.componentName === 'Root',
          designerProps: { droppable: true },
        },
      ],
    },
  })
})

describe('NodeMutation 快捷键', () => {
  it('DeleteNodes 删除选中节点并回选相邻节点', () => {
    const { workspace } = createDesigner()
    const tree = workspace.operation.tree
    const a = new TreeNode({ componentName: 'A', props: {} })
    const b = new TreeNode({ componentName: 'B', props: {} })
    tree.append(a, b)
    workspace.operation.selection.select(b)

    DeleteNodes.handler!({ workspace } as any)

    expect(tree.children).toEqual([a])
    expect(workspace.operation.selection.first).toBe(a.id)

    expect(DeleteNodes.handler!({} as any)).toBeUndefined()
  })

  it('CopyNodes / PasteNodes 复制并粘贴选中节点', () => {
    const { workspace } = createDesigner()
    const tree = workspace.operation.tree
    const a = new TreeNode({ componentName: 'A', props: { value: 1 } })
    tree.append(a)
    workspace.operation.selection.select(a)

    CopyNodes.handler!({ workspace } as any)
    PasteNodes.handler!({ workspace } as any)

    expect(tree.children).toHaveLength(2)
    expect(tree.children[1]).not.toBe(a)
    expect(tree.children[1].componentName).toBe('A')

    expect(CopyNodes.handler!({} as any)).toBeUndefined()
    expect(PasteNodes.handler!({} as any)).toBeUndefined()
  })
})

describe('UndoRedo 快捷键', () => {
  it('UndoMutation / RedoMutation 调用历史并清理 hover', () => {
    const { workspace } = createDesigner()
    const undo = vi.spyOn(workspace.history, 'undo')
    const redo = vi.spyOn(workspace.history, 'redo')
    const clear = vi.spyOn(workspace.operation.hover, 'clear')

    UndoMutation.handler!({ workspace } as any)
    expect(undo).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledTimes(1)

    RedoMutation.handler!({ workspace } as any)
    expect(redo).toHaveBeenCalledTimes(1)
    expect(clear).toHaveBeenCalledTimes(2)

    expect(UndoMutation.handler!({} as any)).toBeUndefined()
    expect(RedoMutation.handler!(undefined as any)).toBeUndefined()
  })
})

describe('SelectAllNodes 快捷键', () => {
  it('选中根节点下所有后代', () => {
    const { workspace } = createDesigner()
    const tree = workspace.operation.tree
    const a = new TreeNode({ componentName: 'A', props: {} })
    const b = new TreeNode({ componentName: 'B', props: {} })
    tree.append(a)
    a.append(b)

    SelectAllNodes.handler!({ workspace } as any)

    expect(workspace.operation.selection.selected).toEqual([a.id, b.id])

    expect(SelectAllNodes.handler!({} as any)).toBeUndefined()
  })
})
