import { describe, expect, it } from 'vitest'

import { Subscribable } from '../subscribable'

describe('Subscribable', () => {
  it('dispatch 会把 payload 和 context 传给订阅者', () => {
    const subscribable = new Subscribable()
    const payloads: any[] = []

    subscribable.subscribe(payload => {
      payloads.push(payload)
    })
    subscribable.dispatch({ type: 'ping' }, { scope: 'test' })

    expect(payloads).toEqual([{ type: 'ping', context: { scope: 'test' } }])
  })

  it('返回的 unsubscribe 能移除对应订阅', () => {
    const subscribable = new Subscribable()
    let count = 0

    const unsubscribe = subscribable.subscribe(() => {
      count++
    })
    subscribable.dispatch({})
    unsubscribe()
    subscribable.dispatch({})

    expect(count).toBe(1)
  })

  it('订阅者返回 false 时 dispatch 返回 false', () => {
    const subscribable = new Subscribable()

    subscribable.subscribe(() => false)

    expect(subscribable.dispatch({})).toBe(false)
  })

  it('subscribe 非函数时返回空操作', () => {
    const subscribable = new Subscribable()
    let count = 0

    const unsubscribe = subscribable.subscribe(undefined as any)
    unsubscribe()
    subscribable.subscribe(() => {
      count++
    })
    subscribable.dispatch({})

    expect(count).toBe(1)
  })

  it('unsubscribe 清空全部订阅', () => {
    const subscribable = new Subscribable()
    let count = 0

    subscribable.subscribe(() => {
      count++
    })
    subscribable.subscribe(() => {
      count++
    })
    subscribable.unsubscribe()
    subscribable.dispatch({})

    expect(count).toBe(0)
  })
})
