import { describe, expect, it } from 'vitest'

import { isHTMLElement, isValidNumber, isWindow } from '../types'

describe('types', () => {
  it('isWindow 只识别 window 对象', () => {
    // happy-dom 的 Window toStringTag 为 EventTarget，这里用标准 [object Window] 校验判定逻辑
    expect(isWindow({ [Symbol.toStringTag]: 'Window' })).toBe(true)
    expect(isWindow(document)).toBe(false)
    expect(isWindow({})).toBe(false)
    expect(isWindow(null)).toBe(false)
  })

  it('isHTMLElement 通过 nodeName / tagName 识别元素', () => {
    expect(isHTMLElement(document.createElement('div'))).toBeTruthy()
    expect(isHTMLElement({ nodeName: 'SPAN' })).toBeTruthy()
    expect(isHTMLElement({ tagName: 'INPUT' })).toBeTruthy()
    expect(isHTMLElement({})).toBeFalsy()
    expect(isHTMLElement(null)).toBeFalsy()
  })

  it('isValidNumber 排除 NaN 与非数字', () => {
    expect(isValidNumber(0)).toBe(true)
    expect(isValidNumber(-1.5)).toBe(true)
    expect(isValidNumber(NaN)).toBe(false)
    expect(isValidNumber('1')).toBe(false)
    expect(isValidNumber(undefined)).toBe(false)
  })
})
