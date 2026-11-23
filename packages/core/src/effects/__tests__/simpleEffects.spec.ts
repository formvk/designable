import { describe, expect, it, vi } from 'vitest'

import { KeyDownEvent } from '../../events/keyboard/KeyDownEvent'
import { KeyUpEvent } from '../../events/keyboard/KeyUpEvent'
import { ViewportResizeEvent } from '../../events/viewport/ViewportResizeEvent'
import { ViewportScrollEvent } from '../../events/viewport/ViewportScrollEvent'
import { useKeyboardEffect } from '../useKeyboardEffect'
import { useViewportEffect } from '../useViewportEffect'

const createHarness = (effect: (engine: any) => void) => {
  const handlers = new Map<any, (event: any) => void>()
  const engine: any = {
    subscribeTo: vi.fn((type: any, handler: (event: any) => void) => {
      handlers.set(type, handler)
    }),
  }
  effect(engine)
  const getHandler = (type: any) => handlers.get(type) as (event: any) => void
  return { engine, getHandler }
}

const createViewport = (matched: boolean) => ({
  matchViewport: vi.fn(() => matched),
  digestViewport: vi.fn(),
})

describe('useViewportEffect', () => {
  it('尺寸变化后刷新匹配的视口与大纲', () => {
    const { getHandler } = createHarness(useViewportEffect)
    const viewport = createViewport(true)
    const outline = createViewport(false)

    getHandler(ViewportResizeEvent)(
      new ViewportResizeEvent({
        scrollX: 0,
        scrollY: 0,
        width: 100,
        height: 100,
        innerWidth: 100,
        innerHeight: 100,
        view: window,
        target: document.body,
      })
    )
    // 无工作区上下文时直接返回
    expect(viewport.matchViewport).not.toHaveBeenCalled()

    const event = new ViewportResizeEvent({
      scrollX: 0,
      scrollY: 0,
      width: 100,
      height: 100,
      innerWidth: 100,
      innerHeight: 100,
      view: window,
      target: document.body,
    })
    ;(event as any).context = { workspace: { viewport, outline } }
    getHandler(ViewportResizeEvent)(event)

    expect(viewport.digestViewport).toHaveBeenCalled()
    expect(outline.digestViewport).not.toHaveBeenCalled()
  })

  it('滚动后刷新匹配的视口与大纲', () => {
    const { getHandler } = createHarness(useViewportEffect)
    const viewport = createViewport(false)
    const outline = createViewport(true)
    const event = new ViewportScrollEvent({
      scrollX: 1,
      scrollY: 2,
      width: 100,
      height: 100,
      innerWidth: 100,
      innerHeight: 100,
      view: window,
      target: document.body,
    })
    ;(event as any).context = { workspace: { viewport, outline } }

    getHandler(ViewportScrollEvent)(event)

    expect(viewport.digestViewport).not.toHaveBeenCalled()
    expect(outline.digestViewport).toHaveBeenCalled()
  })
})

describe('useKeyboardEffect', () => {
  const createKeyboardEngine = () => {
    const keyboard = { handleKeyboard: vi.fn() }
    const getEventContext = vi.fn(() => ({ id: 'context' }))
    const workspace = { getEventContext }
    const { engine, getHandler } = createHarness(useKeyboardEffect)
    engine.keyboard = keyboard
    engine.workbench = { activeWorkspace: workspace, currentWorkspace: workspace }
    return { engine, keyboard, workspace, getEventContext, getHandler }
  }

  it('按键按下与抬起时交给键盘模型处理', () => {
    const { keyboard, getEventContext, getHandler } = createKeyboardEngine()
    const down = new KeyDownEvent(new KeyboardEvent('keydown', { key: 'a' }))
    const up = new KeyUpEvent(new KeyboardEvent('keyup', { key: 'a' }))

    getHandler(KeyDownEvent)(down)
    getHandler(KeyUpEvent)(up)

    expect(keyboard.handleKeyboard).toHaveBeenCalledTimes(2)
    expect(keyboard.handleKeyboard.mock.calls[0][0]).toBe(down)
    expect(keyboard.handleKeyboard.mock.calls[0][1]).toBe(getEventContext.mock.results[0].value)
  })

  it('缺少键盘模型或工作区时跳过', () => {
    const { engine, keyboard, getHandler } = createKeyboardEngine()
    const event = new KeyDownEvent(new KeyboardEvent('keydown', { key: 'a' }))

    engine.keyboard = undefined
    getHandler(KeyDownEvent)(event)

    engine.keyboard = keyboard
    engine.workbench = { activeWorkspace: undefined, currentWorkspace: undefined }
    getHandler(KeyUpEvent)(new KeyUpEvent(new KeyboardEvent('keyup', { key: 'a' })))

    expect(keyboard.handleKeyboard).not.toHaveBeenCalled()
  })

  it('优先使用 currentWorkspace', () => {
    const { engine, keyboard, getEventContext, getHandler } = createKeyboardEngine()
    engine.workbench = { activeWorkspace: undefined, currentWorkspace: { getEventContext } }

    getHandler(KeyDownEvent)(new KeyDownEvent(new KeyboardEvent('keydown', { key: 'a' })))

    expect(getEventContext).toHaveBeenCalled()
    expect(keyboard.handleKeyboard).toHaveBeenCalled()
  })
})
