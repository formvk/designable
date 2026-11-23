import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DragDropDriver } from '../DragDropDriver'
import { KeyboardDriver } from '../KeyboardDriver'
import { MouseClickDriver } from '../MouseClickDriver'
import { MouseMoveDriver } from '../MouseMoveDriver'
import { ViewportResizeDriver } from '../ViewportResizeDriver'
import { ViewportScrollDriver } from '../ViewportScrollDriver'

const createEngine = () =>
  ({
    dispatch: vi.fn(),
    props: { clickStopPropagationAttrName: 'data-click-stop-propagation' },
  }) as any

const createContainer = () => {
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

const mouse = (type: string, init: MouseEventInit & { pageX?: number; pageY?: number } = {}) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, view: window, ...init })
  // happy-dom 不会从初始化参数写入 pageX / pageY，这里显式覆盖
  if (init.pageX !== undefined) {
    Object.defineProperty(event, 'pageX', { value: init.pageX })
  }
  if (init.pageY !== undefined) {
    Object.defineProperty(event, 'pageY', { value: init.pageY })
  }
  return event
}

describe('DragDropDriver', () => {
  const drivers: DragDropDriver[] = []

  const createDriver = () => {
    const engine = createEngine()
    const container = createContainer()
    const driver = new DragDropDriver(engine)
    driver.container = container
    driver.contentWindow = window
    driver.attach()
    drivers.push(driver)
    return { engine, container, driver }
  }

  beforeEach(() => {
    vi.useFakeTimers({ now: 1000 })
  })

  afterEach(() => {
    drivers.forEach(driver => driver.detach())
    drivers.length = 0
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('拖拽距离超过阈值后依次派发开始、移动与结束事件', () => {
    const { engine, container } = createDriver()

    container.dispatchEvent(mouse('mousedown', { clientX: 0, clientY: 0, pageX: 0, pageY: 0 }))
    vi.setSystemTime(1020)
    container.dispatchEvent(mouse('mousemove', { clientX: 10, clientY: 10, pageX: 10, pageY: 10 }))
    expect(engine.dispatch.mock.calls[0][0].type).toBe('drag:start')

    container.dispatchEvent(mouse('mousemove', { clientX: 20, clientY: 20, pageX: 20, pageY: 20 }))
    expect(engine.dispatch.mock.calls[1][0].type).toBe('drag:move')

    container.dispatchEvent(mouse('mouseup', { clientX: 20, clientY: 20, pageX: 20, pageY: 20 }))
    expect(engine.dispatch.mock.calls[2][0].type).toBe('drag:stop')
  })

  it('拖拽中阻止右键菜单', () => {
    const { container } = createDriver()

    container.dispatchEvent(mouse('mousedown', { pageX: 0, pageY: 0 }))
    vi.setSystemTime(1020)
    container.dispatchEvent(mouse('mousemove', { pageX: 10, pageY: 10 }))
    const contextmenu = mouse('contextmenu')
    container.dispatchEvent(contextmenu)

    expect(contextmenu.defaultPrevented).toBe(true)
  })

  it('拖拽中重复 dragstart 与相同坐标的移动不会重复派发', () => {
    const { engine, container } = createDriver()

    container.dispatchEvent(mouse('mousedown', { pageX: 0, pageY: 0 }))
    vi.setSystemTime(1020)
    container.dispatchEvent(mouse('mousemove', { clientX: 10, clientY: 12, pageX: 10, pageY: 12 }))
    expect(engine.dispatch).toHaveBeenCalledTimes(1)

    container.dispatchEvent(mouse('dragstart', { pageX: 10, pageY: 12 }))
    expect(engine.dispatch).toHaveBeenCalledTimes(1)

    container.dispatchEvent(mouse('mousemove', { clientX: 30, clientY: 32, pageX: 30, pageY: 32 }))
    expect(engine.dispatch).toHaveBeenCalledTimes(2)
    container.dispatchEvent(mouse('mousemove', { clientX: 30, clientY: 32, pageX: 30, pageY: 32 }))
    expect(engine.dispatch).toHaveBeenCalledTimes(2)
  })

  it('未经 mousedown 直接 dragstart 也能开始拖拽', () => {
    const { engine, container, driver } = createDriver()

    driver.onStartDrag(mouse('dragstart', { clientX: 5, clientY: 6, pageX: 5, pageY: 6 }))
    expect(engine.dispatch.mock.calls[0][0].type).toBe('drag:start')

    container.dispatchEvent(mouse('dragover', { clientX: 8, clientY: 9, pageX: 8, pageY: 9 }))
    expect(engine.dispatch.mock.calls[1][0].type).toBe('drag:move')
  })

  it('非左键、组合键、可编辑区域与 monaco 不启动拖拽', () => {
    const { engine, container } = createDriver()

    container.dispatchEvent(mouse('mousedown', { button: 2, pageX: 0, pageY: 0 }))
    container.dispatchEvent(mouse('mousedown', { ctrlKey: true, pageX: 0, pageY: 0 }))
    container.dispatchEvent(mouse('mousedown', { metaKey: true, pageX: 0, pageY: 0 }))

    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    container.appendChild(editable)
    editable.dispatchEvent(mouse('mousedown', { pageX: 0, pageY: 0 }))

    const monaco = document.createElement('div')
    monaco.className = 'monaco-editor'
    container.appendChild(monaco)
    monaco.dispatchEvent(mouse('mousedown', { pageX: 0, pageY: 0 }))

    vi.setSystemTime(1020)
    container.dispatchEvent(mouse('mousemove', { pageX: 10, pageY: 10 }))
    expect(engine.dispatch).not.toHaveBeenCalled()
  })

  it('未产生拖拽时 mouseup 仅清理监听', () => {
    const { engine, container } = createDriver()

    container.dispatchEvent(mouse('mousedown', { pageX: 0, pageY: 0 }))
    container.dispatchEvent(mouse('mouseup'))
    vi.setSystemTime(1020)
    container.dispatchEvent(mouse('mousemove', { pageX: 10, pageY: 10 }))

    expect(engine.dispatch).not.toHaveBeenCalled()
  })

  it('detach 后不再响应鼠标事件', () => {
    const { engine, container, driver } = createDriver()

    driver.detach()
    container.dispatchEvent(mouse('mousedown', { pageX: 0, pageY: 0 }))
    vi.setSystemTime(1020)
    container.dispatchEvent(mouse('mousemove', { pageX: 10, pageY: 10 }))

    expect(engine.dispatch).not.toHaveBeenCalled()
  })
})

describe('ViewportResizeDriver', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('contentWindow 存在时在 resize 后派发事件', () => {
    const engine = createEngine()
    const driver = new ViewportResizeDriver(engine)
    const contentWindow: any = {
      scrollX: 3,
      scrollY: 4,
      innerWidth: 800,
      innerHeight: 600,
      document: document,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    driver.container = document
    driver.contentWindow = contentWindow
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      callback()
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    driver.attach()

    const preventDefault = vi.fn()
    driver.onResize({ preventDefault, target: document.body })

    expect(preventDefault).toHaveBeenCalled()
    const event = engine.dispatch.mock.calls[0][0]
    expect(event.type).toBe('viewport:resize')
    expect(event.data.scrollX).toBe(3)
    expect(event.data.width).toBe(800)
    expect(event.data.height).toBe(600)
    expect(event.data.target).toBe(document.body)

    driver.detach()
  })

  it('未提供 contentWindow 时使用 ResizeObserver 监听容器', () => {
    const engine = createEngine()
    const driver = new ViewportResizeDriver(engine)
    const container = createContainer()
    const observe = vi.fn()
    const unobserve = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = observe
        unobserve = unobserve
        disconnect = disconnect
      }
    )
    driver.container = container
    driver.contentWindow = undefined as any
    driver.attach()

    expect(observe).toHaveBeenCalledWith(container)
    driver.detach()
    expect(unobserve).toHaveBeenCalledWith(container)
    expect(disconnect).toHaveBeenCalled()
  })

  it('无观察者时 detach 不报错', () => {
    const driver = new ViewportResizeDriver(createEngine())
    driver.container = document
    driver.contentWindow = undefined as any

    expect(() => driver.detach()).not.toThrow()
  })
})

describe('KeyboardDriver', () => {
  const createDriver = () => {
    const engine = createEngine()
    const container = createContainer()
    const driver = new KeyboardDriver(engine)
    driver.container = container
    driver.contentWindow = window
    driver.attach()
    return { engine, container, driver }
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('普通目标上的按键会派发 keydown / keyup', () => {
    const { engine, container, driver } = createDriver()

    container.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(engine.dispatch.mock.calls[0][0].type).toBe('key:down')

    container.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }))
    expect(engine.dispatch.mock.calls[1][0].type).toBe('key:up')

    driver.detach()
  })

  it('表单控件与可编辑区域上的 keydown 被忽略', () => {
    const { engine, container, driver } = createDriver()

    const input = document.createElement('input')
    const readonlyInput = document.createElement('input')
    readonlyInput.readOnly = true
    const textarea = document.createElement('textarea')
    const select = document.createElement('select')
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    container.append(input, readonlyInput, textarea, select, editable)

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    select.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    editable.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(engine.dispatch).not.toHaveBeenCalled()

    readonlyInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }))
    expect(engine.dispatch).toHaveBeenCalledTimes(1)

    driver.detach()
  })
})

describe('ViewportScrollDriver', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('滚动后经 rAF 派发 viewport:scroll 事件', () => {
    const engine = createEngine()
    const driver = new ViewportScrollDriver(engine)
    const container = createContainer()
    const contentWindow: any = {
      scrollX: 12,
      scrollY: 34,
      innerWidth: 900,
      innerHeight: 700,
      document: { body: { clientWidth: 800, clientHeight: 600 } },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    driver.container = container
    driver.contentWindow = contentWindow
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      callback()
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    driver.attach()

    const preventDefault = vi.fn()
    driver.onScroll({ preventDefault, target: document.body } as any)

    expect(preventDefault).toHaveBeenCalled()
    const event = engine.dispatch.mock.calls[0][0]
    expect(event.type).toBe('viewport:scroll')
    expect(event.data).toMatchObject({
      scrollX: 12,
      scrollY: 34,
      width: 800,
      height: 600,
      innerWidth: 900,
      innerHeight: 700,
    })

    driver.detach()
  })
})

describe('MouseMoveDriver', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('mousemove 经 rAF 节流派发 mouse:move 事件', () => {
    const engine = createEngine()
    const driver = new MouseMoveDriver(engine)
    const container = createContainer()
    driver.container = container
    driver.contentWindow = window
    vi.stubGlobal('requestAnimationFrame', (callback: () => void) => {
      callback()
      return 1
    })
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    driver.attach()

    const event = new MouseEvent('mousemove', { clientX: 1, clientY: 2, view: window })
    Object.defineProperty(event, 'pageX', { value: 3 })
    Object.defineProperty(event, 'pageY', { value: 4 })
    driver.onMouseMove(event)

    const dispatched = engine.dispatch.mock.calls[0][0]
    expect(dispatched.type).toBe('mouse:move')
    expect(dispatched.data).toMatchObject({ clientX: 1, clientY: 2, pageX: 3, pageY: 4 })

    driver.detach()
  })
})

describe('MouseClickDriver', () => {
  const createDriver = () => {
    const engine = createEngine()
    const container = createContainer()
    const driver = new MouseClickDriver(engine)
    driver.container = container
    driver.contentWindow = window
    driver.attach()
    return { engine, container, driver }
  }

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('派发单击与双击事件', () => {
    const { engine, container, driver } = createDriver()

    container.dispatchEvent(mouse('click', { clientX: 1, clientY: 2, pageX: 3, pageY: 4 }))
    expect(engine.dispatch.mock.calls[0][0].type).toBe('mouse:click')
    expect(engine.dispatch.mock.calls[0][0].data.clientX).toBe(1)

    container.dispatchEvent(mouse('dblclick'))
    expect(engine.dispatch.mock.calls[1][0].type).toBe('mouse:dblclick')

    driver.detach()
  })

  it('命中阻止冒泡标记时不派发事件', () => {
    const { engine, container, driver } = createDriver()
    const inner = document.createElement('span')
    inner.setAttribute('data-click-stop-propagation', 'true')
    const leaf = document.createElement('i')
    inner.appendChild(leaf)
    container.appendChild(inner)

    leaf.dispatchEvent(mouse('click'))
    leaf.dispatchEvent(mouse('dblclick'))

    expect(engine.dispatch).not.toHaveBeenCalled()
    driver.detach()
  })
})
