import { describe, expect, it } from 'vitest'

import { cancelIdle, requestIdle } from '../request-idle'

const wait = (duration = 20) => new Promise(resolve => setTimeout(resolve, duration))

describe('requestIdle', () => {
  it('异步执行回调并注入 IdleDeadline', async () => {
    const deadlines: { didTimeout: boolean; timeRemaining: () => number }[] = []

    requestIdle(deadline => {
      deadlines.push(deadline)
    })
    await wait()

    expect(deadlines).toHaveLength(1)
    expect(deadlines[0].didTimeout).toBe(false)
    expect(deadlines[0].timeRemaining()).toBeGreaterThanOrEqual(0)
  })

  it('cancelIdle 能取消尚未执行的回调', async () => {
    let called = 0

    const request = requestIdle(() => {
      called++
    })
    cancelIdle(request)
    await wait()

    expect(called).toBe(0)
  })

  it('多次请求互不影响', async () => {
    const results: number[] = []

    requestIdle(() => {
      results.push(1)
    })
    const second = requestIdle(() => {
      results.push(2)
    })
    cancelIdle(second)
    await wait()

    expect(results).toEqual([1])
  })
})
