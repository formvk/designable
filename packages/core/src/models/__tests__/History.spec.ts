import { describe, expect, it, vi } from 'vitest'

import { History } from '../History'

class CounterContext {
  value = 0

  serialize() {
    return { value: this.value }
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

  it('push / undo / redo 恢复上下文', () => {
    const context = new CounterContext()
    const history = new History(context)

    context.value = 1
    history.push('inc')
    context.value = 2
    history.push('inc')

    expect(history.allowUndo).toBe(true)
    expect(history.allowRedo).toBe(false)

    history.undo()
    expect(context.value).toBe(1)
    expect(history.current).toBe(1)
    expect(history.allowRedo).toBe(true)

    history.undo()
    expect(context.value).toBe(0)
    expect(history.allowUndo).toBe(false)

    history.redo()
    expect(context.value).toBe(1)
  })

  it('undo 后 push 会截断重做分支', () => {
    const context = new CounterContext()
    const history = new History(context)

    context.value = 1
    history.push('first')
    history.undo()

    context.value = 9
    history.push('branch')

    expect(history.history).toHaveLength(2)
    expect(history.history[1].type).toBe('branch')
    expect(history.allowRedo).toBe(false)
  })

  it('goTo 跳转到指定快照', () => {
    const context = new CounterContext()
    const history = new History(context)

    context.value = 1
    history.push('one')
    context.value = 2
    history.push('two')

    history.goTo(0)

    expect(context.value).toBe(0)
    expect(history.current).toBe(0)
  })

  it('超出 maxSize 时丢弃最旧快照', () => {
    const context = new CounterContext()
    const history = new History(context)
    history.maxSize = 3

    for (let i = 1; i <= 4; i++) {
      context.value = i
      history.push(`value-${i}`)
    }

    expect(history.history).toHaveLength(3)
    expect(history.current).toBe(2)
    expect(history.history[2].type).toBe('value-4')
  })

  it('locking 时忽略 push', () => {
    const context = new CounterContext()
    const history = new History(context)

    history.locking = true
    context.value = 1
    history.push('ignored')

    expect(history.history).toHaveLength(1)
    history.locking = false
  })

  it('clear 清空历史', () => {
    const context = new CounterContext()
    const history = new History(context)

    context.value = 1
    history.push('inc')
    history.clear()

    expect(history.history).toEqual([])
    expect(history.current).toBe(0)
  })

  it('触发 onPush / onUndo / onRedo / onGoto 回调', () => {
    const context = new CounterContext()
    const onPush = vi.fn()
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    const onGoto = vi.fn()
    const history = new History(context, { onPush, onUndo, onRedo, onGoto })
    onPush.mockClear()

    context.value = 1
    history.push('inc')
    history.undo()
    history.redo()
    history.goTo(0)

    expect(onPush).toHaveBeenCalledTimes(1)
    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
    expect(onGoto).toHaveBeenCalledTimes(1)
  })
})
