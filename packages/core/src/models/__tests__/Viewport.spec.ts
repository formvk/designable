import { Point, Rect } from '@formvk/designable-shared'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDesigner } from '../../__tests__/helpers'
import { Viewport } from '../Viewport'

const stubRect = (element: Element, rect: Partial<DOMRect>) => {
  element.getBoundingClientRect = () =>
    ({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      toJSON: () => ({}),
      ...rect,
    }) as DOMRect
}

const originalElementFromPoint = document.elementFromPoint

afterEach(() => {
  if (originalElementFromPoint) {
    document.elementFromPoint = originalElementFromPoint
  }
  vi.useRealTimers()
})

describe('Viewport', () => {
  it('默认状态与基础 getter', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport

    expect(viewport.moveSensitive).toBe(true)
    expect(viewport.moveInsertionType).toBe('all')
    expect(viewport.mounted).toBe(false)
    expect(viewport.isMaster).toBe(true)
    expect(viewport.isIframe).toBe(false)
    expect(viewport.viewportRoot).toBe(viewport.viewportElement)
    expect(viewport.scrollContainer).toBe(viewport.viewportElement)
    expect(viewport.isScrollLeft).toBe(true)
    expect(viewport.isScrollTop).toBe(true)
    expect(viewport.isScrollRight).toBe(true)
    expect(viewport.isScrollBottom).toBe(true)
    expect(viewport.scale).toBe(1)
    expect(viewport.offsetX).toBe(0)
    expect(viewport.offsetY).toBe(0)
    expect(viewport.innerRect).toEqual(new Rect(0, 0, 0, 0))
    expect(viewport.matchViewport(viewport.viewportElement)).toBe(true)
    expect(viewport.matchViewport(document.body)).toBe(false)
  })

  it('digestViewport 读取并应用滚动与尺寸', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport
    const element = viewport.viewportElement

    Object.defineProperty(element, 'scrollLeft', { value: 12, configurable: true })
    Object.defineProperty(element, 'scrollTop', { value: 34, configurable: true })
    Object.defineProperty(element, 'clientWidth', { value: 300, configurable: true })
    Object.defineProperty(element, 'clientHeight', { value: 400, configurable: true })

    expect(viewport.getCurrentData()).toEqual({
      scrollX: 12,
      scrollY: 34,
      width: 300,
      height: 400,
    })

    viewport.digestViewport()
    expect(viewport.scrollX).toBe(12)
    expect(viewport.scrollY).toBe(34)
    expect(viewport.width).toBe(300)
    expect(viewport.height).toBe(400)
    expect(viewport.isScrollLeft).toBe(false)
    expect(viewport.isScrollTop).toBe(false)

    viewport.takeDragStartSnapshot()
    expect(viewport.dragStartSnapshot).toEqual({ scrollX: 12, scrollY: 34, width: 300, height: 400 })
    expect(viewport.dragScrollXDelta).toBe(0)
    expect(viewport.dragScrollYDelta).toBe(0)

    viewport.scrollX = 20
    viewport.scrollY = 50
    expect(viewport.dragScrollXDelta).toBe(8)
    expect(viewport.dragScrollYDelta).toBe(16)
  })

  it('cacheElements 与按 id 查找元素', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport

    viewport.viewportElement.innerHTML = `
      <div data-designer-node-id="n1"></div>
      <div data-designer-node-id="n1"></div>
      <div data-designer-node-id="n2"></div>
      <div data-designer-node-id=""></div>
    `

    viewport.cacheElements()
    expect(viewport.nodeElementsStore.n1).toHaveLength(2)
    expect(viewport.findElementById('n1')).toBe(viewport.nodeElementsStore.n1[0])
    expect(viewport.findElementsById('n1')).toHaveLength(2)
    expect(viewport.findElementById('n2')).toBeTruthy()
    expect(viewport.findElementById()).toBeUndefined()
    expect(viewport.findElementsById('')).toEqual([])

    viewport.clearCache()
    expect(viewport.nodeElementsStore).toEqual({})
    expect(viewport.findElementsById('n1')).toHaveLength(2)
    expect(viewport.findElementById('missing')).toBeNull()
  })

  it('containsElement / getOffsetPoint 基于视口坐标', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport
    const child = document.createElement('div')
    viewport.viewportElement.appendChild(child)
    const outside = document.createElement('div')
    document.body.appendChild(outside)

    expect(viewport.containsElement(viewport.viewportElement)).toBe(true)
    expect(viewport.containsElement(child)).toBe(true)
    expect(viewport.containsElement(outside)).toBe(false)
    expect(viewport.getOffsetPoint(new Point(10, 20))).toEqual({ x: 10, y: 20 })
  })

  it('视口命中测试区分视口内外元素', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport
    stubRect(viewport.viewportElement, { x: 0, y: 0, width: 100, height: 100 })

    document.elementFromPoint = vi.fn(() => viewport.viewportElement)
    expect(viewport.isPointInViewport(new Point(50, 50))).toBe(true)
    expect(viewport.isRectInViewport(new Rect(40, 40, 10, 10))).toBe(true)
    expect(viewport.isPointInViewportArea(new Point(50, 50))).toBe(true)
    expect(viewport.isOffsetPointInViewport(new Point(50, 50))).toBe(true)
    expect(viewport.isOffsetRectInViewport(new Rect(40, 40, 10, 10))).toBe(true)
    expect(viewport.elementFromPoint(new Point(10, 10))).toBe(viewport.viewportElement)

    document.elementFromPoint = vi.fn(() => null) as any
    expect(viewport.isOffsetPointInViewport(new Point(50, 50))).toBe(false)
    expect(viewport.isOffsetRectInViewport(new Rect(40, 40, 10, 10))).toBe(false)

    document.elementFromPoint = vi.fn(() => document.body) as any
    expect(viewport.isPointInViewport(new Point(50, 50))).toBe(false)
    expect(viewport.isOffsetPointInViewport(new Point(50, 50))).toBe(false)
    expect(viewport.isRectInViewport(new Rect(40, 40, 10, 10))).toBe(false)
    expect(viewport.isOffsetRectInViewport(new Rect(40, 40, 10, 10))).toBe(false)

    stubRect(viewport.viewportElement, { x: 0, y: 0, width: 0, height: 0 })
    expect(viewport.isPointInViewportArea(new Point(500, 500))).toBe(false)
  })

  it('getElementRect 根据 scale 选择尺寸来源', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport
    const element = document.createElement('div')
    stubRect(element, { x: 10, y: 20, width: 50, height: 60 })

    expect(viewport.getElementRect(element)).toEqual(new Rect(10, 20, 50, 60))

    Object.defineProperty(element, 'offsetWidth', { value: 80, configurable: true })
    Object.defineProperty(element, 'offsetHeight', { value: 90, configurable: true })
    expect(viewport.getElementRect(element)).toEqual(new Rect(10, 20, 50, 60))

    stubRect(viewport.viewportElement, { x: 0, y: 0, width: 200, height: 200 })
    Object.defineProperty(viewport.viewportElement, 'offsetWidth', { value: 100, configurable: true })
    expect(viewport.scale).toBe(2)
    expect(viewport.getElementRect(element)).toEqual(new Rect(10, 20, 80, 90))
  })

  it('getElementRectById 合并同 id 元素', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport
    viewport.viewportElement.innerHTML = ''

    const first = document.createElement('div')
    first.setAttribute('data-designer-node-id', 'a')
    stubRect(first, { x: 10, y: 10, width: 20, height: 20 })
    viewport.viewportElement.appendChild(first)

    const second = document.createElement('div')
    second.setAttribute('data-designer-node-id', 'a')
    stubRect(second, { x: 0, y: 0, width: 5, height: 5 })
    viewport.viewportElement.appendChild(second)

    expect(viewport.getElementRectById('a')).toEqual(new Rect(0, 0, 30, 30))
    expect(viewport.getElementRectById('missing')).toBeUndefined()
  })

  it('getElementOffsetRect 换算滚动偏移', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport
    stubRect(viewport.viewportElement, { x: 0, y: 0, width: 100, height: 100 })
    Object.defineProperty(viewport.viewportElement, 'scrollLeft', { value: 5, configurable: true })
    Object.defineProperty(viewport.viewportElement, 'scrollTop', { value: 7, configurable: true })

    const element = document.createElement('div')
    element.setAttribute('data-designer-node-id', 'o1')
    stubRect(element, { x: 20, y: 30, width: 40, height: 50 })
    viewport.viewportElement.appendChild(element)

    expect(viewport.getElementOffsetRect(element)).toEqual(new Rect(25, 37, 40, 50))
    expect(viewport.getElementOffsetRectById('o1')).toEqual(new Rect(25, 37, 40, 50))
    expect(viewport.getElementOffsetRectById('missing')).toBeUndefined()
  })

  it('getValidNodeElement 向上回退到祖先元素', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport
    viewport.viewportElement.innerHTML = ''

    const parentElement = document.createElement('div')
    parentElement.setAttribute('data-designer-node-id', 'p')
    stubRect(parentElement, { x: 0, y: 0, width: 100, height: 100 })
    viewport.viewportElement.appendChild(parentElement)

    const childElement = document.createElement('div')
    childElement.setAttribute('data-designer-node-id', 'c1')
    stubRect(childElement, { x: 10, y: 10, width: 20, height: 20 })
    parentElement.appendChild(childElement)

    const parent: any = { id: 'p', children: [], parent: null, designerProps: {} }
    parent.root = parent
    const child: any = { id: 'c1', children: [], parent, root: parent, designerProps: {} }
    parent.children = [child]

    expect(viewport.getValidNodeElement(child)).toBe(childElement)

    const orphan: any = { id: 'missing', parent: { id: 'p' } }
    expect(viewport.getValidNodeElement(orphan)).toBe(parentElement)
  })

  it('getChildrenRect / getValidNodeRect 计算节点区域', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport
    viewport.viewportElement.innerHTML = ''

    const parentElement = document.createElement('div')
    parentElement.setAttribute('data-designer-node-id', 'p')
    stubRect(parentElement, { x: 0, y: 0, width: 100, height: 100 })
    viewport.viewportElement.appendChild(parentElement)

    const childElement = document.createElement('div')
    childElement.setAttribute('data-designer-node-id', 'c1')
    stubRect(childElement, { x: 10, y: 10, width: 20, height: 20 })
    parentElement.appendChild(childElement)

    const secondElement = document.createElement('div')
    secondElement.setAttribute('data-designer-node-id', 'c2')
    stubRect(secondElement, { x: 40, y: 40, width: 20, height: 20 })
    parentElement.appendChild(secondElement)

    const parent: any = { id: 'p', children: [], parent: null, designerProps: {} }
    parent.root = parent
    const child: any = { id: 'c1', children: [], parent, root: parent, designerProps: {} }
    const second: any = { id: 'c2', children: [], parent, root: parent, designerProps: {} }
    parent.children = [child, second]

    expect(viewport.getValidNodeRect(undefined)).toBeUndefined()
    expect(viewport.getValidNodeRect(child)).toEqual(new Rect(10, 10, 20, 20))
    expect(viewport.getChildrenRect(parent)).toEqual(new Rect(10, 10, 50, 50))
    expect(viewport.getChildrenRect(child)).toBeUndefined()
    expect(viewport.getChildrenOffsetRect(parent)).toEqual(new Rect(10, 10, 50, 50))

    const missingChild: any = { id: 'missing', children: [], parent, root: parent, designerProps: {} }
    expect(viewport.getValidNodeRect(missingChild)).toBeUndefined()

    stubRect(viewport.viewportElement, { x: 0, y: 0, width: 200, height: 200 })
    parent.isInOperation = true
    expect(viewport.getValidNodeRect(parent)).toEqual(new Rect(0, 0, 200, 200))
    expect(viewport.getValidNodeOffsetRect(parent)).toEqual(new Rect(0, 0, 200, 200))
    expect(viewport.getValidNodeOffsetRect(undefined)).toBeUndefined()

    parent.id = 'missing'
    expect(viewport.getValidNodeRect(parent)).toMatchObject({ x: 0, y: 0, width: 200, height: 200 })

    Object.defineProperty(viewport.viewportElement, 'getBoundingClientRect', {
      value: () => undefined,
      configurable: true,
    })
    expect(viewport.getValidNodeRect(parent)).toBeUndefined()
  })

  it('getValidNodeLayout 根据节点与元素布局返回', () => {
    const { workspace } = createDesigner()
    const viewport = workspace.viewport
    viewport.viewportElement.innerHTML = ''

    expect(viewport.getValidNodeLayout()).toBe('vertical')

    const inlineNode: any = { id: 'inline', parent: { designerProps: { inlineChildrenLayout: true } } }
    expect(viewport.getValidNodeLayout(inlineNode)).toBe('horizontal')

    const missingNode: any = { id: 'missing', parent: { designerProps: {} } }
    expect(viewport.getValidNodeLayout(missingNode)).toBe('vertical')

    const span = document.createElement('span')
    span.setAttribute('data-designer-node-id', 'span')
    viewport.viewportElement.appendChild(span)
    expect(viewport.getValidNodeLayout({ id: 'span', parent: { designerProps: {} } } as any)).toBe('horizontal')

    const div = document.createElement('div')
    div.setAttribute('data-designer-node-id', 'div')
    viewport.viewportElement.appendChild(div)
    expect(viewport.getValidNodeLayout({ id: 'div', parent: { designerProps: {} } } as any)).toBeUndefined()
  })

  it('attachEvents / detachEvents 触发工作区事件挂载', () => {
    vi.useFakeTimers()
    const workspace = { attachEvents: vi.fn(), detachEvents: vi.fn() } as any
    const viewportElement = document.createElement('div')
    const viewport = new Viewport({
      engine: {} as any,
      workspace,
      viewportElement,
      contentWindow: window,
      nodeIdAttrName: 'data-designer-node-id',
    })

    vi.runAllTimers()
    expect(workspace.attachEvents).toHaveBeenCalledWith(viewportElement, window)

    viewport.detachEvents()
    expect(workspace.detachEvents).toHaveBeenCalledWith(viewportElement)
  })

  it('onMount / onUnmount 切换挂载状态', () => {
    const workspace = { attachEvents: vi.fn(), detachEvents: vi.fn() } as any
    const viewport = new Viewport({
      engine: {} as any,
      workspace,
      viewportElement: document.createElement('div'),
      contentWindow: window,
      nodeIdAttrName: 'data-designer-node-id',
    })
    const element = document.createElement('div')

    viewport.onMount(element, window)
    expect(viewport.mounted).toBe(true)
    expect(viewport.viewportElement).toBe(element)
    expect(viewport.contentWindow).toBe(window)

    viewport.onUnmount()
    expect(viewport.mounted).toBe(false)
    expect(workspace.detachEvents).toHaveBeenCalledWith(element)
  })

  it('iframe 模式下使用 contentWindow 作为滚动容器', () => {
    const body = { scrollWidth: 500, scrollHeight: 600 }
    const contentWindow: any = {
      frameElement: {},
      document: { body },
      scrollX: 10,
      scrollY: 20,
      innerWidth: 300,
      innerHeight: 400,
    }
    const workspace = { attachEvents: vi.fn(), detachEvents: vi.fn() } as any
    const viewportElement = document.createElement('div')
    const viewport = new Viewport({
      engine: {} as any,
      workspace,
      viewportElement,
      contentWindow,
      nodeIdAttrName: 'data-designer-node-id',
    })

    expect(viewport.isIframe).toBe(true)
    expect(viewport.viewportRoot).toBe(body)
    expect(viewport.scrollContainer).toBe(contentWindow)
    expect(viewport.isScrollRight).toBe(false)
    expect(viewport.isScrollBottom).toBe(false)
    expect(viewport.getCurrentData()).toEqual({
      scrollX: 10,
      scrollY: 20,
      width: 300,
      height: 400,
    })
    expect(viewport.matchViewport(contentWindow)).toBe(true)
    expect(viewport.matchViewport(contentWindow.document)).toBe(true)
    expect(viewport.matchViewport(body as any)).toBe(false)

    const element = document.createElement('div')
    stubRect(element, { x: 5, y: 6, width: 30, height: 40 })
    expect(viewport.getElementOffsetRect(element)).toEqual(new Rect(15, 26, 30, 40))

    viewport.detachEvents()
    expect(workspace.detachEvents).toHaveBeenCalledWith(contentWindow)
    expect(workspace.detachEvents).toHaveBeenCalledWith(viewportElement)
  })
})
