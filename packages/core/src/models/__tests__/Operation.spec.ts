import { describe, expect, it } from 'vitest'

import { createDesigner } from '../../__tests__/helpers'
import { TreeNode } from '../TreeNode'

const wait = (duration = 30) => new Promise(resolve => setTimeout(resolve, duration))

describe('Operation', () => {
  it('初始化根节点并默认选中', () => {
    const { workspace } = createDesigner()
    const operation = workspace.operation

    expect(operation.tree.componentName).toBe('Root')
    expect(operation.tree.isRoot).toBe(true)
    expect(operation.selection.selected).toEqual([operation.tree.id])
    expect(operation.hover.node).toBeUndefined()
  })

  it('hover 设置与清除节点', () => {
    const { workspace } = createDesigner()
    const { operation } = workspace
    const input = new TreeNode({ componentName: 'Input', props: {} })
    operation.tree.append(input)

    operation.hover.setHover(input)
    expect(operation.hover.node).toBe(input)

    operation.hover.clear()
    expect(operation.hover.node).toBeUndefined()
  })

  it('snapshot 异步写入历史记录', async () => {
    const { workspace } = createDesigner()
    const { operation, history } = workspace
    const initialLength = history.history.length

    operation.snapshot('add-node')
    await wait()

    expect(history.history).toHaveLength(initialLength + 1)
    expect(history.history[history.history.length - 1].type).toBe('add-node')
  })

  it('连续 snapshot 只保留最后一次', async () => {
    const { workspace } = createDesigner()
    const { operation, history } = workspace
    const initialLength = history.history.length

    operation.snapshot('first')
    operation.snapshot('second')
    await wait()

    expect(history.history).toHaveLength(initialLength + 1)
    expect(history.history[history.history.length - 1].type).toBe('second')
  })

  it('serialize 与 from 完成操作快照往返', () => {
    const { workspace } = createDesigner()
    const input = new TreeNode({ componentName: 'Input', props: { label: '用户名' } })
    workspace.operation.tree.append(input)

    const snapshot = workspace.operation.serialize()
    const { workspace: target } = createDesigner()

    target.operation.from(snapshot)

    expect(target.operation.tree.id).toBe(workspace.operation.tree.id)
    expect(target.operation.tree.componentName).toBe('Root')
    expect(target.operation.tree.children[0].componentName).toBe('Input')
    expect(target.operation.tree.children[0].props.label).toBe('用户名')
    expect(target.operation.selection.selected).toEqual(snapshot.selected)
  })
})
