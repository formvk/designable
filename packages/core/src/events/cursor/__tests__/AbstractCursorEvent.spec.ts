import { afterEach, describe, expect, it, vi } from 'vitest'

import { AbstractCursorEvent } from '../AbstractCursorEvent'

const originalElementFromPoint = (document as any).elementFromPoint

afterEach(() => {
  ;(document as any).elementFromPoint = originalElementFromPoint
})

describe('AbstractCursorEvent', () => {
  it('普通视图下 top 坐标与原始坐标一致', () => {
    const event = new AbstractCursorEvent({
      clientX: 10,
      clientY: 20,
      pageX: 30,
      pageY: 40,
      target: document.body,
      view: window,
    })

    expect(event.data.topClientX).toBe(10)
    expect(event.data.topClientY).toBe(20)
    expect(event.data.topPageX).toBe(30)
    expect(event.data.topPageY).toBe(40)
    expect(event.data.target).toBe(document.body)
    expect(event.data.view).toBe(window)
  })

  it('未提供 view 时回退到全局视图', () => {
    const event = new AbstractCursorEvent({
      clientX: 1,
      clientY: 2,
      pageX: 3,
      pageY: 4,
      target: null,
      view: null,
    })

    expect(event.data.view).toBeTruthy()
    expect(event.data.topClientX).toBe(1)
    expect(event.data.topPageY).toBe(4)
  })

  it('iframe 视图下按缩放与偏移换算坐标并替换 target', () => {
    const frameElement: any = document.createElement('iframe')
    Object.defineProperty(frameElement, 'offsetWidth', { value: 500 })
    frameElement.getBoundingClientRect = () => ({ x: 10, y: 20, width: 1000, height: 500 }) as DOMRect
    const topElement = document.createElement('div')
    ;(document as any).elementFromPoint = vi.fn(() => topElement)

    const event = new AbstractCursorEvent({
      clientX: 4,
      clientY: 6,
      pageX: 100,
      pageY: 200,
      target: null,
      view: {
        frameElement,
        scrollX: 5,
        scrollY: 7,
      } as any,
    })

    expect(event.data.topClientX).toBe(18)
    expect(event.data.topClientY).toBe(32)
    expect(event.data.topPageX).toBe(105)
    expect(event.data.topPageY).toBe(213)
    expect(event.data.target).toBe(topElement)
  })

  it('iframe 视图下命中 frameElement 时保留原始 target', () => {
    const frameElement: any = document.createElement('iframe')
    Object.defineProperty(frameElement, 'offsetWidth', { value: 1000 })
    frameElement.getBoundingClientRect = () => ({ x: 0, y: 0, width: 1000, height: 1000 }) as DOMRect
    ;(document as any).elementFromPoint = vi.fn(() => frameElement)

    const event = new AbstractCursorEvent({
      clientX: 1,
      clientY: 2,
      pageX: 3,
      pageY: 4,
      target: document.body,
      view: {
        frameElement,
        scrollX: 0,
        scrollY: 0,
      } as any,
    })

    expect(event.data.topClientX).toBe(1)
    expect(event.data.topPageX).toBe(3)
    expect(event.data.target).toBe(document.body)
  })
})
