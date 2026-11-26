import { describe, expect, it, vi } from 'vitest'

import { History } from '../History'

class CounterContext {
  value = 0

  serialize() {
    return { value: this.value }
  }

  serializeSync() {
    return this.serialize()
  }

  from(json: { value: number }) {
    this.value = json.value
  }
}

describe('History', () => {
  it('初始化时记录首个快照', () => {
    const history = new History(new CounterContext())

    expect(history.history).toHaveLength(1)
    expect(history.current).toBe(0)
    expect(history.allowUndo).toBe(false)
    expect(history.allowRedo).toBe(false)
  })

  it('push / undo / redo 恢复上下文', async () => {
    const context = new CounterContext()
    const history = new History(context)

    context.value = 1
    await history.push('inc')
    context.value = 2
    await history.push('inc')

    expect(history.allowUndo).toBe(true)
    expect(history.allowRedo).toBe(false)

    await history.undo()
    expect(context.value).toBe(1)
    expect(history.current).toBe(1)
    expect(history.allowRedo).toBe(true)

    await history.undo()
    expect(context.value).toBe(0)
    expect(history.allowUndo).toBe(false)

    await history.redo()
    expect(context.value).toBe(1)
  })

  it('连续 undo 按队列顺序执行', async () => {
    const context = new CounterContext()
    const history = new History(context)

    context.value = 1
    await history.push('one')
    context.value = 2
    await history.push('two')

    await Promise.all([history.undo(), history.undo()])

    expect(context.value).toBe(0)
    expect(history.current).toBe(0)
    expect(history.allowUndo).toBe(false)
  })

  it('undo 后 push 会截断重做分支', async () => {
    const context = new CounterContext()
    const history = new History(context)

    context.value = 1
    await history.push('first')
    await history.undo()

    context.value = 9
    await history.push('branch')

    expect(history.history).toHaveLength(2)
    expect(history.history[1].type).toBe('branch')
    expect(history.allowRedo).toBe(false)
  })

  it('goTo 跳转到指定快照', async () => {
    const context = new CounterContext()
    const history = new History(context)

    context.value = 1
    await history.push('one')
    context.value = 2
    await history.push('two')

    await history.goTo(0)

    expect(context.value).toBe(0)
    expect(history.current).toBe(0)
  })

  it('超出 maxSize 时丢弃最旧快照', async () => {
    const context = new CounterContext()
    const history = new History(context)
    history.maxSize = 3

    for (let i = 1; i <= 4; i++) {
      context.value = i
      await history.push(`value-${i}`)
    }

    expect(history.history).toHaveLength(3)
    expect(history.current).toBe(2)
    expect(history.history[2].type).toBe('value-4')
  })

  it('locking 时忽略 push', async () => {
    const context = new CounterContext()
    const history = new History(context)

    history.locking = true
    context.value = 1
    await history.push('ignored')

    expect(history.history).toHaveLength(1)
    history.locking = false
  })

  it('undo 期间 push 被丢弃', async () => {
    const context = new CounterContext()
    const history = new History(context)
    const from = history.context.from.bind(history.context)
    let resolving: () => void = () => {}
    const gate = new Promise<void>(resolve => {
      resolving = resolve
    })

    context.value = 1
    await history.push('one')
    context.value = 2
    await history.push('two')

    history.context.from = async json => {
      await gate
      from(json)
    }

    const undoing = history.undo()
    const pushing = history.push('during-undo')
    resolving()
    await Promise.all([undoing, pushing])

    expect(history.history).toHaveLength(3)
    expect(context.value).toBe(1)
  })

  it('clear 清空历史', async () => {
    const context = new CounterContext()
    const history = new History(context)

    context.value = 1
    await history.push('inc')
    history.clear()

    expect(history.history).toEqual([])
    expect(history.current).toBe(0)
  })

  it('触发 onPush / onUndo / onRedo / onGoto 回调', async () => {
    const context = new CounterContext()
    const onPush = vi.fn()
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    const onGoto = vi.fn()
    const history = new History(context, { onPush, onUndo, onRedo, onGoto })
    onPush.mockClear()

    context.value = 1
    await history.push('inc')
    await history.undo()
    await history.redo()
    await history.goTo(0)

    expect(onPush).toHaveBeenCalledTimes(1)
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
    expect(onGoto).toHaveBeenCalledTimes(1)
  })

  it('构造函数支持异步 serialize，但初始快照使用 serializeSync', () => {
    const serialize = vi.fn()
    const serializeSync = vi.fn(() => ({ value: 0 }))
    const context = {
      value: 0,
      serialize,
      serializeSync,
      from: vi.fn(),
    }
    const history = new History(context)

    expect(serializeSync).toHaveBeenCalledTimes(1)
    expect(serialize).not.toHaveBeenCalled()
    expect(history.history).toHaveLength(1)
  })
})
