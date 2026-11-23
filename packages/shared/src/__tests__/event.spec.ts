import { describe, expect, it, vi } from 'vitest'

import { Event, EventDriver } from '../event'

describe('Event', () => {
  it('subscribeWith 按事件类型过滤', () => {
    const event = new Event({})
    const received: string[] = []

    event.subscribeWith('add', payload => {
      received.push(payload.type)
    })
    event.dispatch({ type: 'add' })
    event.dispatch({ type: 'remove' })

    expect(received).toEqual(['add'])
  })

  it('subscribeWith 支持类型数组', () => {
    const event = new Event({})
    const received: string[] = []

    event.subscribeWith(['add', 'remove'], payload => {
      received.push(payload.type)
    })
    event.dispatch({ type: 'add' })
    event.dispatch({ type: 'remove' })
    event.dispatch({ type: 'update' })

    expect(received).toEqual(['add', 'remove'])
  })

  it('subscribeTo 按事件类过滤', () => {
    class AddEvent {
      type = 'add'
    }

    const event = new Event({})
    const received: AddEvent[] = []

    event.subscribeTo(AddEvent, payload => {
      received.push(payload)
    })
    event.dispatch(new AddEvent())
    event.dispatch({ type: 'add' })

    expect(received).toHaveLength(1)
    expect(received[0]).toBeInstanceOf(AddEvent)
  })

  it('dispatch 会向订阅者注入 context', () => {
    const event = new Event({})
    let receivedContext: unknown

    event.subscribe(payload => {
      receivedContext = payload.context
    })
    event.dispatch({ type: 'ping' }, { workspace: 'w1' })

    expect(receivedContext).toEqual({ workspace: 'w1' })
  })

  it('返回的 unsubscribe 能移除监听', () => {
    const event = new Event({})
    let count = 0

    const unsubscribe = event.subscribe(() => {
      count++
    })
    event.dispatch({ type: 'ping' })
    unsubscribe()
    event.dispatch({ type: 'ping' })

    expect(count).toBe(1)
  })

  it('effects 在构造时执行', () => {
    let received: Event | undefined
    const event = new Event({
      effects: [
        engine => {
          received = engine
        },
      ],
    })

    expect(received).toBe(event)
  })

  it('attachEvents / detachEvents 管理驱动生命周期', () => {
    let attachCount = 0
    let detachCount = 0

    class TestDriver extends EventDriver {
      attach() {
        attachCount++
        this.addEventListener('click', this.onClick)
      }

      detach() {
        detachCount++
        this.removeEventListener('click', this.onClick)
      }

      onClick = () => {
        this.dispatch({ type: 'click' })
      }
    }

    const engine = new Event({ drivers: [TestDriver] })
    const container = document.createElement('div')
    let clicks = 0
    engine.subscribeWith('click', () => {
      clicks++
    })

    engine.attachEvents(container)
    expect(attachCount).toBe(1)

    container.dispatchEvent(new window.Event('click'))
    expect(clicks).toBe(1)

    engine.attachEvents(container)
    expect(attachCount).toBe(1)

    container.dispatchEvent(new window.Event('click'))
    expect(clicks).toBe(2)

    engine.detachEvents(container)
    expect(detachCount).toBe(1)

    container.dispatchEvent(new window.Event('click'))
    expect(clicks).toBe(2)
  })

  it('detachEvents 不传容器时清空全部', () => {
    class NoopDriver extends EventDriver {
      attach() {}
      detach() {}
    }

    const engine = new Event({ drivers: [NoopDriver] })
    const first = document.createElement('div')
    const second = document.createElement('div')

    engine.attachEvents(first)
    engine.attachEvents(second)
    engine.detachEvents()

    expect(() => engine.detachEvents(first)).not.toThrow()
  })

  it('attachEvents 忽略空容器', () => {
    const engine = new Event({})

    expect(() => engine.attachEvents(undefined as any)).not.toThrow()
  })

  it('EventDriver 默认 attach / detach 输出错误提示', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const driver = new EventDriver(new Event({}))

    driver.attach()
    driver.detach()

    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
  })

  it('EventDriver 的 resize / scroll 事件绑定到 contentWindow', () => {
    const driver = new EventDriver(new Event({}))
    driver.container = document
    driver.contentWindow = window

    expect(driver.eventTarget('resize')).toBe(window)
    expect(driver.eventTarget('scroll')).toBe(window)
    expect(driver.eventTarget('click')).toBe(document)
  })

  it('container 不是 document 时 resize / scroll 仍绑定到容器', () => {
    const driver = new EventDriver(new Event({}))
    driver.container = document.createElement('div')
    driver.contentWindow = window

    expect(driver.eventTarget('resize')).toBe(driver.container)
    expect(driver.eventTarget('scroll')).toBe(driver.container)
  })

  it('attachEvents 支持传入 window 并转发到 document', () => {
    class WindowDriver extends EventDriver {
      attach() {}

      detach() {}
    }

    const engine = new Event({ drivers: [WindowDriver] })
    engine.attachEvents(window)
    window.document.dispatchEvent(new window.Event('click'))

    expect(() => engine.detachEvents(window)).not.toThrow()
  })

  it('detachEvents 忽略未附加的容器', () => {
    const engine = new Event({})

    expect(() => engine.detachEvents(document.createElement('div'))).not.toThrow()
  })
})

describe('EventDriver 单例与批量监听', () => {
  class TestDriver extends EventDriver {
    attach() {}

    detach() {}
  }

  const createDriver = () => {
    const engine = new Event({ drivers: [TestDriver] })
    return new TestDriver(engine)
  }

  it('onlyOne 模式下同一目标只注册一次', () => {
    const driver = createDriver()
    const container = document.createElement('div')
    driver.container = container
    const listener = vi.fn()

    driver.addEventListener('click', listener, { mode: 'onlyOne' })
    driver.addEventListener('click', vi.fn(), { mode: 'onlyOne' })
    container.dispatchEvent(new window.Event('click'))

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('onlyChild 模式下移除祖先监听并迁移到子元素', () => {
    const driver = createDriver()
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    document.body.appendChild(parent)
    const parentListener = vi.fn()
    const childListener = vi.fn()
    driver.container = parent

    driver.addEventListener('click', parentListener, { mode: 'onlyChild' })
    driver.container = child
    driver.addEventListener('click', childListener, { mode: 'onlyChild' })

    child.dispatchEvent(new window.Event('click', { bubbles: true }))
    expect(parentListener).not.toHaveBeenCalled()
    expect(childListener).toHaveBeenCalledTimes(1)
  })

  it('onlyParent 模式下子元素不再注册监听', () => {
    const driver = createDriver()
    const parent = document.createElement('div')
    const child = document.createElement('span')
    parent.appendChild(child)
    document.body.appendChild(parent)
    const childListener = vi.fn()
    driver.container = parent

    driver.addEventListener('click', vi.fn(), { mode: 'onlyParent' })
    driver.container = child
    driver.addEventListener('click', childListener, { mode: 'onlyParent' })

    child.dispatchEvent(new window.Event('click', { bubbles: true }))
    expect(childListener).not.toHaveBeenCalled()
  })

  it('removeEventListener 在单例模式下清理状态', () => {
    const driver = createDriver()
    const container = document.createElement('div')
    driver.container = container
    const listener = vi.fn()

    driver.addEventListener('click', listener, { mode: 'onlyOne' })
    driver.removeEventListener('click', listener, { mode: 'onlyOne' })
    container.dispatchEvent(new window.Event('click'))
    expect(listener).not.toHaveBeenCalled()
  })

  it('普通模式下重复添加同一监听只生效一次', () => {
    const driver = createDriver()
    const container = document.createElement('div')
    driver.container = container
    const listener = vi.fn()

    driver.addEventListener('click', listener)
    driver.addEventListener('click', listener)
    container.dispatchEvent(new window.Event('click'))
    expect(listener).toHaveBeenCalledTimes(1)

    driver.removeEventListener('click', listener)
    container.dispatchEvent(new window.Event('click'))
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('batchAddEventListener / batchRemoveEventListener 作用于全部驱动容器', () => {
    const engine = new Event({ drivers: [TestDriver] })
    const first = new TestDriver(engine)
    const second = new TestDriver(engine)
    const firstContainer = document.createElement('div')
    const secondContainer = document.createElement('div')
    first.container = firstContainer
    second.container = secondContainer
    const listener = vi.fn()

    first.batchAddEventListener('click', listener)
    second.batchAddEventListener('click', listener)
    firstContainer.dispatchEvent(new window.Event('click'))
    secondContainer.dispatchEvent(new window.Event('click'))
    expect(listener).toHaveBeenCalledTimes(2)

    first.batchRemoveEventListener('click', listener)
    firstContainer.dispatchEvent(new window.Event('click'))
    secondContainer.dispatchEvent(new window.Event('click'))
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
