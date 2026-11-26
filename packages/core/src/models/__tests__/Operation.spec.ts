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

  it('hover 设置与清除节点', async () => {
    const { workspace } = createDesigner()
    const { operation } = workspace
    const input = new TreeNode({ componentName: 'Input', props: {} })
    await operation.tree.append(input)

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

  it('serialize 与 from 完成操作快照往返', async () => {
    const { workspace } = createDesigner()
    const input = new TreeNode({ componentName: 'Input', props: { label: '用户名' } })
    await workspace.operation.tree.append(input)

    const snapshot = await workspace.operation.serialize()
    const { workspace: target } = createDesigner()

    await target.operation.from(snapshot)

    expect(target.operation.tree.id).toBe(workspace.operation.tree.id)
    expect(target.operation.tree.componentName).toBe('Root')
    expect(target.operation.tree.children[0].componentName).toBe('Input')
    expect(target.operation.tree.children[0].props.label).toBe('用户名')
    expect(target.operation.selection.selected).toEqual(snapshot.selected)

    expect(workspace.operation.serializeSync()).toMatchObject({ selected: [workspace.operation.tree.id] })
  })

  it('runMutation 串行执行任务且单次失败不阻断后续任务', async () => {
    const { operation } = createDesigner().workspace
    const order: number[] = []
    let releaseFirst: () => void = () => {}
    const gate = new Promise<void>(resolve => {
      releaseFirst = resolve
    })

    const first = operation.runMutation(async () => {
      order.push(1)
      await gate
      order.push(2)
    })
    const second = operation.runMutation(() => {
      order.push(3)
    })
    const failed = operation.runMutation(async () => {
      throw new Error('boom')
    })
    const afterFailed = operation.runMutation(() => {
      order.push(4)
    })

    await wait(0)
    expect(order).toEqual([1])

    releaseFirst()
    await first
    await second
    await expect(failed).rejects.toThrow('boom')
    await afterFailed

    expect(order).toEqual([1, 2, 3, 4])
  })
})
