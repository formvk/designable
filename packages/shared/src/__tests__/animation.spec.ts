import { afterEach, describe, expect, it, vi } from 'vitest'

import { calcSpeedFactor, createUniformSpeedAnimation } from '../animation'

describe('animation', () => {
  let frames: FrameRequestCallback[] = []
  const cancel = vi.fn()

  const installRaf = () => {
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback)
      return frames.length
    })
    vi.stubGlobal('cancelAnimationFrame', cancel)
    cancel.mockClear()
    frames = []
  }

  afterEach(() => {
    vi.unstubAllGlobals()
    frames = []
  })

  it('calcSpeedFactor 越接近阈值速度越小', () => {
    expect(calcSpeedFactor(25, 100)).toBe(0.75)
    expect(calcSpeedFactor(100, 100)).toBe(0)
    expect(calcSpeedFactor(150, 100)).toBe(0)
  })

  it('createUniformSpeedAnimation 每帧回调递增 delta', () => {
    installRaf()
    const deltas: number[] = []

    const stop = createUniformSpeedAnimation(100, delta => {
      deltas.push(delta)
    })

    frames.shift()!(16)
    frames.shift()!(32)
    frames.shift()!(48)

    expect(deltas[0]).toBe(0)
    expect(deltas[1]).toBeCloseTo(1.6)
    expect(deltas[2]).toBeCloseTo(3.2)

    stop()
    expect(cancel).toHaveBeenCalled()
  })

  it('stop 后不再产生新帧', () => {
    installRaf()

    const stop = createUniformSpeedAnimation(10, () => {})
    frames.shift()!(16)
    stop()
    const pending = frames.length
    frames.forEach(frame => frame(32))

    expect(pending).toBeGreaterThan(0)
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})
