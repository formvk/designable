import { afterEach, describe, expect, it, vi } from 'vitest'

import { LayoutObserver } from '../observer'

describe('LayoutObserver', () => {
  const resizeObserve = vi.fn()
  const resizeDisconnect = vi.fn()
  const performanceObserve = vi.fn()
  const performanceDisconnect = vi.fn()
  const mutationObserve = vi.fn()
  const mutationDisconnect = vi.fn()
  const callbacks: (() => void)[] = []

  const installObservers = () => {
    callbacks.length = 0
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          callbacks.push(callback)
        }
        observe = resizeObserve
        disconnect = resizeDisconnect
      }
    )
    vi.stubGlobal(
      'PerformanceObserver',
      class {
        constructor(callback: () => void) {
          callbacks.push(callback)
        }
        observe = performanceObserve
        disconnect = performanceDisconnect
      }
    )
    vi.stubGlobal(
      'MutationObserver',
      class {
        constructor(callback: () => void) {
          callbacks.push(callback)
        }
        observe = mutationObserve
        disconnect = mutationDisconnect
      }
    )
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('observe 连接三类 observer，disconnect 统一断开', () => {
    installObservers()
    const onChange = vi.fn()
    const observer = new LayoutObserver(onChange)
    const element = document.createElement('div')

    observer.observe(element)

    expect(resizeObserve).toHaveBeenCalledWith(element)
    expect(performanceObserve).toHaveBeenCalledWith({
      entryTypes: ['paint', 'element', 'layout-shift', 'event'],
    })
    expect(mutationObserve).toHaveBeenCalledWith(element, { attributeFilter: ['style'], attributes: true })

    callbacks.forEach(callback => callback())
    expect(onChange).toHaveBeenCalledTimes(3)

    observer.disconnect()
    observer.disconnect()

    expect(resizeDisconnect).toHaveBeenCalledTimes(1)
    expect(performanceDisconnect).toHaveBeenCalledTimes(1)
    expect(mutationDisconnect).toHaveBeenCalledTimes(1)
  })

  it('未连接时 disconnect 不触发断开', () => {
    installObservers()
    const observer = new LayoutObserver()

    observer.disconnect()

    expect(resizeDisconnect).not.toHaveBeenCalled()
    expect(performanceDisconnect).not.toHaveBeenCalled()
    expect(mutationDisconnect).not.toHaveBeenCalled()
  })
})
