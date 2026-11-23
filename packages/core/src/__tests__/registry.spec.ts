import { describe, expect, it } from 'vitest'

import { GlobalRegistry } from '../registry'

const createBehavior = (name: string, selector: () => boolean = () => true) => ({
  name,
  selector,
})

describe('GlobalRegistry', () => {
  it('registerDesignerLocales 后可按语言取文案', () => {
    GlobalRegistry.registerDesignerLocales({
      'zh-CN': { Hello: '你好' },
      'en-US': { Hello: 'Hello' },
    })
    GlobalRegistry.setDesignerLanguage('zh-CN')

    expect(GlobalRegistry.getDesignerLanguage()).toBe('zh-cn')
    expect(GlobalRegistry.getDesignerMessage('hello')).toBe('你好')

    GlobalRegistry.setDesignerLanguage('en-US')
    expect(GlobalRegistry.getDesignerMessage('Hello')).toBe('Hello')
  })

  it('getDesignerLanguage 支持模糊匹配与回退', () => {
    GlobalRegistry.setDesignerLanguage('zh')
    expect(GlobalRegistry.getDesignerLanguage()).toBe('zh-cn')

    GlobalRegistry.setDesignerLanguage('de-DE')
    expect(GlobalRegistry.getDesignerLanguage()).toBe('de-DE')
  })

  it('getDesignerMessage 未命中语言时跨语言回退', () => {
    GlobalRegistry.setDesignerLanguage('de-DE')

    expect(GlobalRegistry.getDesignerMessage('hello')).toBe('你好')
    expect(GlobalRegistry.getDesignerMessage('not_exists')).toBeUndefined()
  })

  it('getDesignerMessage 支持显式 locales', () => {
    GlobalRegistry.setDesignerLanguage('zh-CN')

    expect(
      GlobalRegistry.getDesignerMessage('hello', {
        'zh-cn': { hello: '显式文案' },
      })
    ).toBe('显式文案')
  })

  it('registerDesignerIcons / getDesignerIcon 注册并读取图标', () => {
    GlobalRegistry.registerDesignerIcons({ Copy: 'icon-copy' })

    expect(GlobalRegistry.getDesignerIcon('Copy')).toBe('icon-copy')
    expect(GlobalRegistry.getDesignerIcon('Missing')).toBeUndefined()
  })

  it('setDesignerBehaviors 归一化行为宿主并按 selector 过滤', () => {
    const node = { id: 'node-1' } as any
    const matched = createBehavior('Matched', () => true)
    const unmatched = createBehavior('Unmatched', () => false)

    GlobalRegistry.setDesignerBehaviors([
      { Behavior: [matched] },
      [unmatched],
      { Behavior: [] },
      [] as any,
      null as any,
      { foo: 1 } as any,
    ])

    expect(GlobalRegistry.getDesignerBehaviors(node).map(behavior => behavior.name)).toEqual(['Matched'])
  })

  it('registerDesignerBehaviors 按依赖顺序排列并去重', () => {
    const node = { id: 'node-1' } as any
    const dependency = createBehavior('Dependency')
    const child = { ...createBehavior('Child'), extends: ['Dependency'] }

    GlobalRegistry.registerDesignerBehaviors({
      pkg: { Behavior: [child, dependency] },
    })

    expect(GlobalRegistry.getDesignerBehaviors(node).map(behavior => behavior.name)).toEqual(['Dependency', 'Child'])
  })

  it('registerDesignerBehaviors 缺少依赖时抛错', () => {
    expect(() =>
      GlobalRegistry.registerDesignerBehaviors({
        pkg: {
          Behavior: [{ ...createBehavior('Orphan'), extends: ['Missing'] }],
        },
      })
    ).toThrowError('No Missing behavior that Orphan depends on')
  })
})
