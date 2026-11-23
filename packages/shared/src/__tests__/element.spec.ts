import { describe, expect, it } from 'vitest'

import {
  calcElementLayout,
  calcElementOuterWidth,
  calcElementRotate,
  calcElementScale,
  calcElementTranslate,
} from '../element'

describe('element', () => {
  it('calcElementTranslate 解析 translate 变换', () => {
    const element = document.createElement('div')

    element.style.transform = 'translate(12px, 34px)'
    expect(calcElementTranslate(element)).toEqual({ x: 12, y: 34 })

    element.style.transform = 'translate3d(12.5px, 34.5px, 0px)'
    expect(calcElementTranslate(element)).toEqual({ x: 12.5, y: 34.5 })
  })

  it('calcElementRotate / calcElementScale 解析对应变换', () => {
    const element = document.createElement('div')

    element.style.transform = 'rotate(45deg)'
    expect(calcElementRotate(element)).toBe(45)

    element.style.transform = 'scale(2)'
    expect(calcElementScale(element)).toBe(2)
  })

  it('没有 transform 时回退 offset 或 0', () => {
    const element = document.createElement('div')

    expect(calcElementRotate(element)).toBe(0)
    expect(calcElementScale(element)).toBe(0)
  })

  it('calcElementOuterWidth 累加盒模型尺寸', () => {
    const style = {
      marginLeft: '10px',
      marginRight: '5px',
      paddingLeft: '2px',
      paddingRight: '3px',
      borderLeftWidth: '1px',
      borderRightWidth: '2px',
    } as CSSStyleDeclaration

    expect(calcElementOuterWidth(100, style)).toBe(123)
  })

  it('calcElementLayout 判断水平/垂直布局', () => {
    expect(calcElementLayout(undefined as any)).toBe('vertical')

    const orphan = document.createElement('div')
    expect(calcElementLayout(orphan)).toBe('vertical')

    const table = document.createElement('table')
    const row = document.createElement('tr')
    const cell = document.createElement('td')
    row.appendChild(cell)
    table.appendChild(row)
    expect(calcElementLayout(cell)).toBe('horizontal')

    const flexParent = document.createElement('div')
    flexParent.style.display = 'flex'
    flexParent.style.flexDirection = 'row'
    const flexChild = document.createElement('div')
    flexParent.appendChild(flexChild)
    document.body.appendChild(flexParent)
    expect(calcElementLayout(flexChild)).toBe('horizontal')

    const parent = document.createElement('div')
    document.body.appendChild(parent)
    const span = document.createElement('span')
    parent.appendChild(span)
    expect(calcElementLayout(span)).toBe('horizontal')

    span.style.display = 'block'
    expect(calcElementLayout(span)).toBe('vertical')

    const block = document.createElement('div')
    parent.appendChild(block)
    expect(calcElementLayout(block)).toBeUndefined()
  })
})
