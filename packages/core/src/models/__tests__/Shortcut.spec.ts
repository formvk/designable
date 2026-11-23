import { describe, expect, it, vi } from 'vitest'

import { KeyCode, Shortcut } from '../Shortcut'

describe('Shortcut', () => {
  it('parseCodes 归一化单键与组合键', () => {
    const shortcut = new Shortcut({
      codes: [KeyCode.Control, [KeyCode.Control, KeyCode.Z]] as any,
    })

    expect(shortcut.codes).toEqual([[KeyCode.Control], [KeyCode.Control, KeyCode.Z]])
  })

  it('matchCode / sortCodes 忽略大小写并排序', () => {
    expect(Shortcut.matchCode(KeyCode.Z, 'z' as KeyCode)).toBe(true)
    expect(Shortcut.matchCode(undefined as any, KeyCode.Z)).toBe(false)
    expect(Shortcut.sortCodes([KeyCode.Z, KeyCode.Control])).toEqual(['control', 'z'])
  })

  it('matched 仅在匹配时调用 handler', () => {
    const handler = vi.fn()
    const shortcut = new Shortcut({ codes: [KeyCode.Z], handler })

    expect(shortcut.matched(false, {} as any)).toBe(false)
    expect(handler).not.toHaveBeenCalled()

    expect(shortcut.matched(true, {} as any)).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('preventCodes 需要完整按下组合键', () => {
    const shortcut = new Shortcut({ codes: [[KeyCode.Control, KeyCode.Z]] })

    expect(shortcut.preventCodes([KeyCode.Control])).toBe(false)
    expect(shortcut.preventCodes([KeyCode.Control, KeyCode.Z])).toBe(true)
    expect(shortcut.preventCodes([KeyCode.Shift, KeyCode.Z])).toBe(false)

    expect(new Shortcut({ codes: [] }).preventCodes([KeyCode.Z])).toBe(false)
  })

  it('match 排序后比较并触发 handler', () => {
    const handler = vi.fn()
    const shortcut = new Shortcut({ codes: [[KeyCode.Control, KeyCode.Z]], handler })
    const context = {} as any

    expect(shortcut.match([KeyCode.Z, KeyCode.Control], context)).toBe(true)
    expect(handler).toHaveBeenCalledTimes(1)

    expect(shortcut.match([KeyCode.Z], context)).toBe(false)
    expect(shortcut.match([KeyCode.Shift, KeyCode.Z], context)).toBe(false)
  })

  it('match 支持多个候选组合', () => {
    const shortcut = new Shortcut({
      codes: [KeyCode.Escape, [KeyCode.Control, KeyCode.Z]] as any,
    })

    expect(shortcut.match([KeyCode.Escape], {} as any)).toBe(true)
    expect(shortcut.match([KeyCode.Control, KeyCode.Z], {} as any)).toBe(true)
    expect(shortcut.match([KeyCode.Escape, KeyCode.Control, KeyCode.Z], {} as any)).toBe(false)
  })

  it('match 优先使用自定义 matcher', () => {
    const handler = vi.fn()
    const matcher = vi.fn(codes => codes.includes('z' as KeyCode))
    const shortcut = new Shortcut({ codes: [KeyCode.Z], matcher, handler })

    expect(shortcut.match([KeyCode.Z], {} as any)).toBe(true)
    expect(matcher).toHaveBeenCalledWith(['z'])
    expect(shortcut.match([KeyCode.X], {} as any)).toBe(false)
  })
})
