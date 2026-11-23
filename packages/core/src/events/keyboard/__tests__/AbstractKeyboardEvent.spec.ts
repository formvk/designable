import { describe, expect, it } from 'vitest'

import { AbstractKeyboardEvent } from '../AbstractKeyboardEvent'

describe('AbstractKeyboardEvent', () => {
  it('透传原始键盘事件的修饰键与类型', () => {
    const originEvent = new KeyboardEvent('keydown', {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      metaKey: true,
      altKey: true,
    })
    const event = new AbstractKeyboardEvent(originEvent)

    expect(event.originEvent).toBe(originEvent)
    expect(event.eventType).toBe('keydown')
    expect(event.ctrlKey).toBe(true)
    expect(event.shiftKey).toBe(true)
    expect(event.metaKey).toBe(true)
    expect(event.altkey).toBe(true)
  })

  it('preventDefault 与 stopPropagation 代理到原始事件', () => {
    const originEvent = new KeyboardEvent('keydown', { key: 'z', cancelable: true, bubbles: true })
    const event = new AbstractKeyboardEvent(originEvent)

    event.preventDefault()
    event.stopPropagation()

    expect(originEvent.defaultPrevented).toBe(true)
  })

  it('原始事件缺少方法时回退到属性赋值', () => {
    const originEvent: any = { type: 'keydown', returnValue: true, cancelBubble: false }
    const event = new AbstractKeyboardEvent(originEvent)

    event.preventDefault()
    event.stopPropagation()

    expect(originEvent.returnValue).toBe(false)
    expect(originEvent.cancelBubble).toBe(true)
  })
})
