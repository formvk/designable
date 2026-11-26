import { KeyCode } from '@formvk/designable-shared'
import { describe, expect, it, vi } from 'vitest'

import { createDesigner } from '../../__tests__/helpers'
import { Engine } from '../Engine'
import { DESIGNER_PIPELINES, Pipeline } from '../Pipeline'
import { Shortcut } from '../Shortcut'
import { TreeNode } from '../TreeNode'

const wait = (duration = 10) => new Promise(resolve => setTimeout(resolve, duration))

describe('Pipeline', () => {
  it('按 order 升序执行中间件，进入终端后再逆序返回', async () => {
    const pipeline = new Pipeline()
    const calls: string[] = []

    pipeline.use(
      'test',
      async (_ctx: any, next: () => any) => {
        calls.push('before-2')
        const result = await next()
        calls.push('after-2')
        return result
      },
      { id: 'second', order: 2 }
    )
    pipeline.use(
      'test',
      async (_ctx: any, next: () => any) => {
        calls.push('before-1')
        const result = await next()
        calls.push('after-1')
        return result
      },
      { id: 'first', order: 1 }
    )

    const result = await pipeline.run('test', {}, async () => {
      calls.push('terminal')
      return 'ok'
    })

    expect(calls).toEqual(['before-1', 'before-2', 'terminal', 'after-2', 'after-1'])
    expect(result).toBe('ok')
  })

  it('异步中间件在 await 前后保持洋葱顺序', async () => {
    const pipeline = new Pipeline()
    const calls: string[] = []

    pipeline.use('async', async (_ctx: any, next: () => any) => {
      calls.push('outer-before')
      await wait()
      const result = await next()
      await wait()
      calls.push('outer-after')
      return result
    })
    pipeline.use('async', async (_ctx: any, next: () => any) => {
      calls.push('inner-before')
      await wait()
      const result = await next()
      calls.push('inner-after')
      return result
    })

    await pipeline.run('async', {}, async () => {
      await wait()
      calls.push('terminal')
      return 'done'
    })

    expect(calls).toEqual(['outer-before', 'inner-before', 'terminal', 'inner-after', 'outer-after'])
  })

  it('中间件不调用 next 时短路终端并返回中间件结果', async () => {
    const pipeline = new Pipeline()
    const terminal = vi.fn(() => 'terminal')

    pipeline.use('test', () => 'canceled')

    await expect(pipeline.run('test', {}, terminal)).resolves.toBe('canceled')
    expect(terminal).not.toHaveBeenCalled()
  })

  it('disposer 移除中间件，且旧 disposer 不影响同 id 的新注册', async () => {
    const pipeline = new Pipeline()
    const first = vi.fn((_ctx: any, next: () => any) => next())
    const second = vi.fn((_ctx: any, next: () => any) => next())
    const disposeFirst = pipeline.use('test', first, { id: 'same' })
    pipeline.use('test', second, { id: 'same' })

    await pipeline.run('test', {}, () => 'ok')
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)

    disposeFirst()
    await pipeline.run('test', {}, () => 'ok')
    expect(second).toHaveBeenCalledTimes(2)
  })

  it('重复调用 next 返回 rejected Promise', async () => {
    const pipeline = new Pipeline()
    pipeline.use('test', async (_ctx: any, next: () => any) => {
      await next()
      await next()
    })

    await expect(pipeline.run('test', {}, () => 'ok')).rejects.toThrow(/called multiple times/)
  })

  it('has / clear 管理管道', () => {
    const pipeline = new Pipeline()
    const middleware = (_ctx: any, next: () => any) => next()

    expect(pipeline.has('test')).toBe(false)
    pipeline.use('test', middleware)
    expect(pipeline.has('test')).toBe(true)

    pipeline.clear('test')
    expect(pipeline.has('test')).toBe(false)

    pipeline.use('a', middleware)
    pipeline.use('b', middleware)
    pipeline.clear()
    expect(pipeline.has('a')).toBe(false)
    expect(pipeline.has('b')).toBe(false)
  })

  it('空管道直接执行终端并返回 Promise', async () => {
    const pipeline = new Pipeline()
    const result = pipeline.run('missing', {}, () => 'ok')

    expect(result).toBeInstanceOf(Promise)
    await expect(result).resolves.toBe('ok')
  })
})

describe('Pipeline 接入点', () => {
  it('初始化默认树不触发 node.mutation 中间件', () => {
    const engine = new Engine({})
    const middleware = vi.fn((_ctx: any, next: () => any) => next())
    engine.pipeline.use(DESIGNER_PIPELINES.nodeMutation, middleware)

    engine.workbench.addWorkspace({
      id: 'w1',
      title: '工作区',
      description: '',
      contentWindow: window,
      viewportElement: document.createElement('div'),
    })

    expect(middleware).not.toHaveBeenCalled()
  })

  it('node.mutation 支持异步否决结构变更并跳过快照', async () => {
    const { engine, workspace } = createDesigner()
    const tree = workspace.operation.tree
    const node = new TreeNode({ componentName: 'Input', props: {} })
    const snapshot = vi.spyOn(workspace.operation, 'snapshot')

    engine.pipeline.use(DESIGNER_PIPELINES.nodeMutation, async (context: any) => {
      await wait()
      if (context.event.type === 'append:node') return
      context.result = context.event.data
    })

    await expect(tree.append(node)).resolves.toEqual([])
    expect(tree.children).not.toContain(node)
    expect(snapshot).not.toHaveBeenCalled()
  })

  it('node.mutation 可通过 event.data.source 改写目标节点', async () => {
    const { engine, workspace } = createDesigner()
    const tree = workspace.operation.tree
    const node = new TreeNode({ componentName: 'Input', props: {} })
    const replacement = new TreeNode({ componentName: 'Textarea', props: {} })

    engine.pipeline.use(DESIGNER_PIPELINES.nodeMutation, async (context: any, next) => {
      await wait()
      if (context.event.type === 'append:node') {
        context.event.data.source = [replacement]
      }
      await next()
    })

    await expect(tree.append(node)).resolves.toEqual([replacement])
    expect(tree.children).toEqual([replacement])
    expect(node.parent).toBeUndefined()
  })

  it('command 拦截 remove / clone', async () => {
    const { engine, workspace } = createDesigner()
    const tree = workspace.operation.tree
    const node = new TreeNode({ componentName: 'Input', props: {} })
    await tree.append(node)
    const clone = vi.spyOn(node, 'clone')

    engine.pipeline.use(DESIGNER_PIPELINES.command, (context: any) => {
      if (context.action === 'remove' || context.action === 'clone') return
    })

    await TreeNode.remove([node])
    expect(node.parent).toBe(tree)

    await TreeNode.clone([node])
    expect(clone).not.toHaveBeenCalled()
  })

  it('command 拦截 undo', async () => {
    const { engine, workspace } = createDesigner()
    const tree = workspace.operation.tree
    const node = new TreeNode({ componentName: 'Input', props: { value: 1 } })
    await tree.append(node)
    await workspace.history.push('first')
    node.props.value = 2
    await workspace.history.push('second')

    const current = workspace.history.current
    engine.pipeline.use(DESIGNER_PIPELINES.command, (context: any) => {
      if (context.action === 'undo') return
    })

    await workspace.history.undo()
    expect(node.props.value).toBe(2)
    expect(workspace.history.current).toBe(current)
  })

  it('serialize 中间件只执行一次并可改写结果', async () => {
    const { engine, workspace } = createDesigner()
    const tree = workspace.operation.tree
    await tree.append(new TreeNode({ componentName: 'Input', props: {} }))
    const middleware = vi.fn(async (context: any, next: () => any) => {
      await next()
      context.result = {
        ...context.result,
        props: { ...context.result.props, serialized: true },
      }
    })
    engine.pipeline.use(DESIGNER_PIPELINES.serialize, middleware)

    const data = await tree.serialize()

    expect(data.props.serialized).toBe(true)
    expect(data.children).toHaveLength(1)
    expect(middleware).toHaveBeenCalledTimes(1)
  })

  it('deserialize 中间件可改写来源数据', async () => {
    const { engine, workspace } = createDesigner()
    const tree = workspace.operation.tree

    engine.pipeline.use(DESIGNER_PIPELINES.deserialize, async (context: any, next) => {
      await wait()
      context.source = { ...context.source, componentName: 'Container' }
      await next()
    })
    await tree.from({ componentName: 'Input', props: {} })

    expect(tree.componentName).toBe('Container')
  })

  it('shortcut 中间件可短路快捷键处理', async () => {
    const { engine } = createDesigner()
    const handler = vi.fn()
    const shortcut = new Shortcut({ codes: [KeyCode.Z], handler })

    engine.pipeline.use(DESIGNER_PIPELINES.shortcut, () => undefined)
    expect(shortcut.match([KeyCode.Z], { engine } as any)).toBe(true)
    await wait()
    expect(handler).not.toHaveBeenCalled()
  })

  it('workbench 中间件可改写切换目标与工作台类型', async () => {
    const { engine, workspace } = createDesigner('w1')
    const second = engine.workbench.addWorkspace({
      id: 'w2',
      title: '第二工作区',
      description: '',
      contentWindow: window,
      viewportElement: document.createElement('div'),
    })
    await engine.workbench.switchWorkspace('w1')
    expect(engine.workbench.currentWorkspace).toBe(workspace)

    engine.pipeline.use(DESIGNER_PIPELINES.workbench, (context: any, next) => {
      if (context.action === 'switch') {
        context.to = 'w2'
      }
      if (context.action === 'type') {
        context.type = 'PREVIEW'
      }
      next()
    })

    await engine.workbench.switchWorkspace('w1')
    expect(engine.workbench.currentWorkspace).toBe(second)

    await engine.workbench.setWorkbenchType('DESIGNABLE')
    expect(engine.workbench.type).toBe('PREVIEW')
  })

  it('undo 在途期间触发的结构变更排队执行，不与历史恢复分叉', async () => {
    const { workspace } = createDesigner()
    const tree = workspace.operation.tree
    await tree.append(new TreeNode({ componentName: 'Input', props: {} }))
    await wait(20)
    expect(workspace.history.history).toHaveLength(2)

    let releaseGate: () => void = () => {}
    const gate = new Promise<void>(resolve => {
      releaseGate = resolve
    })
    workspace.engine.pipeline.use(DESIGNER_PIPELINES.deserialize, async (_context, next) => {
      await gate
      await next()
    })

    const undoing = workspace.history.undo()
    await wait(0)
    const pending = new TreeNode({ componentName: 'Button', props: {} })
    const appending = tree.append(pending)
    // 历史恢复在途，排队中的 append 不得提前落地
    expect(tree.children).not.toContain(pending)

    releaseGate()
    await undoing
    await appending
    await wait(20)

    // undo 先恢复到空树，排队的 append 在 locking 释放后落地并截断重做分支
    expect(tree.children).toEqual([pending])
    expect(workspace.history.current).toBe(1)
    expect(workspace.history.history).toHaveLength(2)
    expect(workspace.history.allowRedo).toBe(false)
  })

  it('初始快照绕过 serialize 管道，仍可经 deserialize 链路无损往返', async () => {
    const { engine, workspace } = createDesigner()
    const tree = workspace.operation.tree
    engine.pipeline.use(DESIGNER_PIPELINES.serialize, async (context: any, next) => {
      await next()
      context.result = {
        ...context.result,
        props: { ...context.result.props, transformed: true },
      }
    })

    await tree.append(new TreeNode({ componentName: 'Input', props: { title: 'a' } }))
    await wait(20)

    // seed 走 serializeSync（无管道标记），idle 快照走 serialize 管道（带标记）
    const seedData = workspace.history.history[0].data
    const pushedData = workspace.history.history[1].data
    expect(seedData.operation.tree.props.transformed).toBeUndefined()
    expect(pushedData.operation.tree.props.transformed).toBe(true)
    expect(pushedData.operation.tree.children).toHaveLength(1)

    // 回到 seed：原始格式不经逆转换也能正确恢复
    await workspace.history.undo()
    expect(tree.children).toHaveLength(0)
    expect(tree.componentName).toBe('Root')

    // 重做应用管道格式快照，透传后同样可还原
    await workspace.history.redo()
    expect(tree.children).toHaveLength(1)
    expect(tree.children[0].componentName).toBe('Input')
  })

  it('并发 switchWorkspace 按调用顺序串行落地', async () => {
    const { engine } = createDesigner('w1')
    engine.workbench.addWorkspace({
      id: 'w2',
      title: '第二工作区',
      description: '',
      contentWindow: window,
      viewportElement: document.createElement('div'),
    })
    const order: string[] = []
    let releaseFirst: () => void = () => {}
    const gate = new Promise<void>(resolve => {
      releaseFirst = resolve
    })
    engine.pipeline.use(DESIGNER_PIPELINES.workbench, async (context: any, next) => {
      if (context.action !== 'switch') return next()
      order.push(`enter:${context.id}`)
      if (context.id === 'w1') await gate
      await next()
      order.push(`leave:${context.id}`)
    })

    const first = engine.workbench.switchWorkspace('w1')
    await wait(0)
    const second = engine.workbench.switchWorkspace('w2')
    await wait(0)
    // 第二个动作在队列中等待，第一个未释放前不得进入
    expect(order).toEqual(['enter:w1'])

    releaseFirst()
    await Promise.all([first, second])

    expect(order).toEqual(['enter:w1', 'leave:w1', 'enter:w2', 'leave:w2'])
    expect(engine.workbench.currentWorkspace?.id).toBe('w2')
  })
})
