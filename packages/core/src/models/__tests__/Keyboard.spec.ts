import { afterEach, describe, expect, it, vi } from 'vitest'

import { Keyboard } from '../Keyboard'
import { KeyCode, Shortcut } from '../Shortcut'

const createKeyboard = (shortcuts: Shortcut[] = []) => new Keyboard({ props: { shortcuts } } as any)

const createKeydownEvent = (
  data: KeyCode,
  modifiers: Partial<Record<'ctrlKey' | 'shiftKey' | 'metaKey' | 'altKey', boolean>> = {}
) => ({
  eventType: 'keydown',
  data,
  ctrlKey: false,
  shiftKey: false,
  metaKey: false,
  altKey: false,
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  ...modifiers,
})

describe('Keyboard', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('addKeyCode / includes / excludes 维护按键序列', () => {
    const keyboard = createKeyboard()

    keyboard.addKeyCode(KeyCode.Control)
    keyboard.addKeyCode(KeyCode.Control)
    expect(keyboard.sequence).toEqual([KeyCode.Control])

    expect(keyboard.includes(KeyCode.Control)).toBe(true)
    expect(keyboard.includes(KeyCode.Shift)).toBe(false)

    keyboard.excludes(KeyCode.Control)
    expect(keyboard.sequence).toEqual([])

    keyboard.addKeyCode(KeyCode.Shift)
    keyboard.removeKeyCode(KeyCode.Shift)
    expect(keyboard.sequence).toEqual([])

    keyboard.removeKeyCode(KeyCode.Alt)
    expect(keyboard.sequence).toEqual([])
  })

  it('isModifier 识别修饰键', () => {
    const keyboard = createKeyboard()

    expect(keyboard.isModifier(KeyCode.Meta)).toBe(true)
    expect(keyboard.isModifier(KeyCode.Shift)).toBe(true)
    expect(keyboard.isModifier(KeyCode.Control)).toBe(true)
    expect(keyboard.isModifier(KeyCode.Alt)).toBe(true)
    expect(keyboard.isModifier(KeyCode.Z)).toBe(false)
  })

  it('handleModifiers 将按下的修饰键前置到序列', () => {
    const keyboard = createKeyboard()

    keyboard.handleModifiers(createKeydownEvent(KeyCode.Z, { ctrlKey: true, shiftKey: true }) as any)

    expect(keyboard.sequence).toEqual([KeyCode.Control, KeyCode.Shift])
  })

  it('matchCodes / preventCodes 遍历快捷键', () => {
    const keyboard = createKeyboard([new Shortcut({ codes: [[KeyCode.Control, KeyCode.Z]] })])

    keyboard.sequence = [KeyCode.Control, KeyCode.Z]
    expect(keyboard.matchCodes({} as any)).toBe(true)
    expect(keyboard.preventCodes()).toBe(true)

    keyboard.sequence = [KeyCode.Control]
    expect(keyboard.matchCodes({} as any)).toBe(false)
    expect(keyboard.preventCodes()).toBe(false)
  })

  it('handleKeyboard keydown 命中快捷键后清空序列并阻止默认行为', () => {
    vi.useFakeTimers()
    const handler = vi.fn()
    const keyboard = createKeyboard([new Shortcut({ codes: [KeyCode.Z], handler })])
    const event = createKeydownEvent(KeyCode.Z)

    keyboard.handleKeyboard(event as any, {} as any)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(keyboard.sequence).toEqual([])
    expect(keyboard.isKeyDown(KeyCode.Z)).toBe(true)
    expect(event.preventDefault).toHaveBeenCalled()
    expect(event.stopPropagation).toHaveBeenCalled()

    vi.advanceTimersByTime(4000)
    expect(keyboard.isKeyDown(KeyCode.Z)).toBe(false)
    expect(keyboard.sequence).toEqual([])
  })

  it('handleKeyboard keyup 修饰键清空序列并重置 keyDown', () => {
    const keyboard = createKeyboard()
    keyboard.sequence = [KeyCode.Control, KeyCode.Z]
    keyboard.keyDown = KeyCode.Z

    keyboard.handleKeyboard({ eventType: 'keyup', data: KeyCode.Control } as any, {} as any)
    expect(keyboard.sequence).toEqual([])
    expect(keyboard.keyDown).toBeUndefined()

    keyboard.sequence = [KeyCode.Z]
    keyboard.keyDown = KeyCode.Z
    keyboard.handleKeyboard({ eventType: 'keyup', data: KeyCode.Z } as any, {} as any)
    expect(keyboard.sequence).toEqual([KeyCode.Z])
    expect(keyboard.keyDown).toBeUndefined()
  })

  it('requestClean 到期后重置按键状态', () => {
    vi.useFakeTimers()
    const keyboard = createKeyboard()
    keyboard.addKeyCode(KeyCode.Z)
    keyboard.keyDown = KeyCode.Z

    keyboard.requestClean(100)
    vi.advanceTimersByTime(100)

    expect(keyboard.sequence).toEqual([])
    expect(keyboard.keyDown).toBeUndefined()
  })
})
