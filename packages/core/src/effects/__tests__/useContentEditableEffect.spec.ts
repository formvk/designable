import { globalThisPolyfill } from '@formvk/shared'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MouseClickEvent, MouseDoubleClickEvent } from '../../events/cursor/MouseClickEvent'
import { useContentEditableEffect } from '../useContentEditableEffect'

const stubSelection = (value: any = null) => {
  const spy = vi.spyOn(globalThisPolyfill, 'getSelection').mockReturnValue(value)
  return () => spy.mockRestore()
}

const engines: Array<{ getHandler: (type: any) => (event: any) => void }> = []

const createEngine = () => {
  const subscriptions: Array<{ type: any; handler: (event: any) => void }> = []
  const tree = { findById: vi.fn() }
  const engine: any = {
    props: {
      contentEditableAttrName: 'data-content-editable',
      contentEditableNodeIdAttrName: 'data-content-editable-node-id',
      nodeIdAttrName: 'data-node-id',
    },
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      subscriptions.push({ type, handler })
    }),
    workbench: { activeWorkspace: { operation: { tree } } },
  }
  useContentEditableEffect(engine)
  const getHandler = (type: any) => subscriptions.find(item => item.type === type)?.handler as (event: any) => void
  engines.push({ getHandler })
  return { engine, tree, getHandler }
}

const createEditable = (attrs: Record<string, string> = {}) => {
  const element = document.createElement('div')
  element.setAttribute('data-content-editable', 'true')
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value))
  element.textContent = 'hello'
  document.body.appendChild(element)
  return element
}

describe('useContentEditableEffect', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    engines.forEach(({ getHandler }) => {
      getHandler(MouseClickEvent)?.({ data: { target: document.createElement('div') } })
    })
    engines.length = 0
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('双击可编辑元素进入编辑态并同步输入内容', () => {
    const { tree, getHandler } = createEngine()
    const node: any = { props: {}, takeSnapshot: vi.fn() }
    tree.findById.mockReturnValue(node)
    const element = createEditable({ 'data-content-editable-node-id': 'node-1' })
    const restoreSelection = stubSelection(null)

    getHandler(MouseDoubleClickEvent)({ data: { target: element } })
    restoreSelection()

    expect(element.getAttribute('contenteditable')).toBe('true')
    expect(element.getAttribute('spellcheck')).toBe('false')
    expect(document.activeElement).toBe(element)

    element.textContent = 'changed'
    element.dispatchEvent(new Event('input'))
    vi.runAllTimers()

    expect(node.props['true']).toBe('changed')
    expect(node.takeSnapshot).toHaveBeenCalledWith('update:node:props')

    const keydown = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    element.dispatchEvent(keydown)
    expect(keydown.defaultPrevented).toBe(true)
  })

  it('通过祖先节点的 nodeId 查找可编辑节点', () => {
    const { tree, getHandler } = createEngine()
    const node: any = { props: {}, takeSnapshot: vi.fn() }
    tree.findById.mockReturnValue(node)
    const element = createEditable()
    const parent = document.createElement('div')
    parent.setAttribute('data-node-id', 'parent-1')
    parent.appendChild(element)
    document.body.appendChild(parent)
    const restoreSelection = stubSelection(null)

    getHandler(MouseDoubleClickEvent)({ data: { target: element } })
    restoreSelection()

    expect(tree.findById).toHaveBeenCalledWith('parent-1')
    expect(element.getAttribute('contenteditable')).toBe('true')
  })

  it('缺少节点信息或已处于编辑态时不处理', () => {
    const { engine, tree, getHandler } = createEngine()
    const element = createEditable()
    const handler = getHandler(MouseDoubleClickEvent)

    handler({ data: { target: document.createElement('div') } })
    expect(element.getAttribute('contenteditable')).toBeNull()

    tree.findById.mockReturnValue(undefined)
    handler({ data: { target: element } })
    expect(element.getAttribute('contenteditable')).toBeNull()

    engine.workbench.activeWorkspace = undefined
    handler({ data: { target: createEditable() } })

    engine.workbench.activeWorkspace = { operation: { tree } }
    const missingIdElement = createEditable()
    handler({ data: { target: missingIdElement } })
    expect(missingIdElement.getAttribute('contenteditable')).toBeNull()

    tree.findById.mockReturnValue({ props: {}, takeSnapshot: vi.fn() })
    const active = createEditable({ 'data-content-editable-node-id': 'node-2' })
    active.setAttribute('contenteditable', 'true')
    handler({ data: { target: active } })
    expect(tree.findById).not.toHaveBeenCalledWith('node-2')
  })

  it('组合输入期间不触发快照', () => {
    const { tree, getHandler } = createEngine()
    const node: any = { props: {}, takeSnapshot: vi.fn() }
    tree.findById.mockReturnValue(node)
    const element = createEditable({ 'data-content-editable-node-id': 'node-3' })
    const restoreSelection = stubSelection(null)

    getHandler(MouseDoubleClickEvent)({ data: { target: element } })
    restoreSelection()

    element.dispatchEvent(new Event('compositionstart'))
    element.textContent = '拼'
    element.dispatchEvent(new Event('input'))
    vi.runAllTimers()
    expect(node.takeSnapshot).not.toHaveBeenCalled()

    element.dispatchEvent(new Event('compositionend'))
    vi.runAllTimers()
    expect(node.takeSnapshot).not.toHaveBeenCalled()
  })

  it('单击非编辑区退出编辑态，单击编辑区保持不变', () => {
    const { tree, getHandler } = createEngine()
    tree.findById.mockReturnValue({ props: {}, takeSnapshot: vi.fn() })
    const element = createEditable({ 'data-content-editable-node-id': 'node-4' })
    const clickHandler = getHandler(MouseClickEvent)
    const restoreSelection = stubSelection(null)

    getHandler(MouseDoubleClickEvent)({ data: { target: element } })
    restoreSelection()
    expect(element.getAttribute('contenteditable')).toBe('true')

    clickHandler({ data: { target: element } })
    expect(element.getAttribute('contenteditable')).toBe('true')

    const outside = document.createElement('div')
    clickHandler({ data: { target: outside } })
    expect(element.getAttribute('contenteditable')).toBeNull()
    expect(element.getAttribute('spellcheck')).toBeNull()
  })

  it('selectionchange 触发队列中的同步任务', () => {
    const { tree, getHandler } = createEngine()
    const node: any = { props: {}, takeSnapshot: vi.fn() }
    tree.findById.mockReturnValue(node)
    const element = createEditable({ 'data-content-editable-node-id': 'node-5' })
    const restoreSelection = stubSelection(null)

    getHandler(MouseDoubleClickEvent)({ data: { target: element } })
    restoreSelection()
    element.textContent = 'next'
    element.dispatchEvent(new Event('input'))
    document.dispatchEvent(new Event('selectionchange'))
    vi.runAllTimers()

    expect(node.takeSnapshot).toHaveBeenCalledWith('update:node:props')
  })

  it('粘贴内容写入节点属性', () => {
    const { tree, getHandler } = createEngine()
    const node: any = { props: {}, takeSnapshot: vi.fn() }
    tree.findById.mockReturnValue(node)
    const element = createEditable({ 'data-content-editable-node-id': 'node-6' })
    const target = document.createElement('span')
    const anchor = document.createElement('div')
    anchor.textContent = 'anchor'
    element.appendChild(target)
    document.body.appendChild(element)
    document.body.appendChild(anchor)

    const restoreSelection = stubSelection(null)
    getHandler(MouseDoubleClickEvent)({ data: { target: element } })
    restoreSelection()

    element.dispatchEvent(new Event('input'))
    const range = document.createRange()
    range.setStart(anchor.firstChild as Node, 0)
    range.setEnd(anchor.firstChild as Node, 0)
    const selection = document.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    const paste = new Event('paste', { bubbles: true, cancelable: true })
    Object.defineProperty(paste, 'clipboardData', {
      value: { getData: () => 'text' },
    })
    target.dispatchEvent(paste)

    expect(paste.defaultPrevented).toBe(true)
    expect(anchor.textContent).toContain('text')
    expect(node.props).toHaveProperty('true')
  })
})
