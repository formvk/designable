import { afterEach, describe, expect, it, vi } from 'vitest'

import { calcAutoScrollBasicInfo, scrollAnimate, updateScrollValue } from '../scroller'

const viewport = {
  left: 0,
  top: 0,
  right: 1000,
  bottom: 1000,
  width: 1000,
  height: 1000,
} as DOMRect

describe('scroller', () => {
  it('calcAutoScrollBasicInfo 判断滚动方向与速度', () => {
    expect(calcAutoScrollBasicInfo({ x: 980, y: 500 }, 'x', viewport)).toEqual({
      direction: 'end',
      speedFactor: 0,
      speed: 64,
    })
    expect(calcAutoScrollBasicInfo({ x: 20, y: 500 }, 'x', viewport)).toEqual({
      direction: 'begin',
      speedFactor: 0,
      speed: 64,
    })
    expect(calcAutoScrollBasicInfo({ x: 500, y: 500 }, 'x', viewport)).toBeNull()
    expect(calcAutoScrollBasicInfo({ x: 500, y: 990 }, 'y', viewport)?.direction).toBe('end')
    expect(calcAutoScrollBasicInfo({ x: 500, y: 100 }, 'y', viewport)).toBeNull()
  })

  it('updateScrollValue 更新元素滚动位置', () => {
    const element = document.createElement('div')
    Object.defineProperty(element, 'scrollWidth', { value: 100, configurable: true })
    Object.defineProperty(element, 'scrollHeight', { value: 100, configurable: true })
    element.scrollLeft = 50
    element.scrollTop = 50

    const xCallback = vi.fn()
    const yCallback = vi.fn()
    updateScrollValue(element, 'x', 10, xCallback)
    updateScrollValue(element, 'y', 20, yCallback)

    expect(element.scrollLeft).toBe(60)
    expect(element.scrollTop).toBe(70)
    expect(xCallback).toHaveBeenCalledWith(60)
    expect(yCallback).toHaveBeenCalledWith(70)

    updateScrollValue(element, 'x', 100)
    updateScrollValue(element, 'y', 100)
    expect(element.scrollLeft).toBe(60)
    expect(element.scrollTop).toBe(70)
  })

  it('updateScrollValue 对 window 使用 scrollBy', () => {
    const fakeWindow = {
      [Symbol.toStringTag]: 'Window',
      scrollBy: vi.fn(),
    } as any
    const callback = vi.fn()

    updateScrollValue(fakeWindow, 'x', 30, callback)
    updateScrollValue(fakeWindow, 'y', 40)

    expect(fakeWindow.scrollBy).toHaveBeenNthCalledWith(1, { left: 30, behavior: 'smooth' })
    expect(fakeWindow.scrollBy).toHaveBeenNthCalledWith(2, { top: 40, behavior: 'smooth' })
    expect(callback).toHaveBeenCalledWith(30)
  })

  it('updateScrollValue 忽略空元素', () => {
    expect(() => updateScrollValue(undefined as any, 'x', 10)).not.toThrow()
  })
})

describe('scrollAnimate', () => {
  let frames: FrameRequestCallback[] = []

  afterEach(() => {
    vi.unstubAllGlobals()
    frames = []
  })

  it('按帧更新滚动值', () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const element = document.createElement('div')
    Object.defineProperty(element, 'scrollHeight', { value: 1000, configurable: true })
    const callback = vi.fn()

    const stop = scrollAnimate(element, 'y', 'end', 100, callback)
    frames.shift()!(16)
    frames.shift()!(32)

    expect(element.scrollTop).toBeGreaterThan(0)
    expect(callback).toHaveBeenCalled()

    stop()
    expect(cancelAnimationFrame).toHaveBeenCalled()
  })
})
