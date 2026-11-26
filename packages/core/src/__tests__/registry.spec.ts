import { describe, expect, it } from 'vitest'

import { Registry } from '../models/Registry'

const createBehavior = (name: string, selector: () => boolean = () => true) => ({
  name,
  selector,
})

describe('Registry', () => {
  const registry = new Registry()

  it('registerDesignerLocales 后可按语言取文案', () => {
    registry.registerDesignerLocales({
      'zh-CN': { Hello: '你好' },
      'en-US': { Hello: 'Hello' },
    })
    registry.setDesignerLanguage('zh-CN')

    expect(registry.getDesignerLanguage()).toBe('zh-cn')
    expect(registry.getDesignerMessage('hello')).toBe('你好')

    registry.setDesignerLanguage('en-US')
    expect(registry.getDesignerMessage('Hello')).toBe('Hello')
  })

  it('getDesignerLanguage 支持模糊匹配与回退', () => {
    registry.setDesignerLanguage('zh')
    expect(registry.getDesignerLanguage()).toBe('zh-cn')

    registry.setDesignerLanguage('de-DE')
    expect(registry.getDesignerLanguage()).toBe('de-DE')
  })

  it('getDesignerMessage 未命中语言时跨语言回退', () => {
    registry.setDesignerLanguage('de-DE')

    expect(registry.getDesignerMessage('hello')).toBe('你好')
    expect(registry.getDesignerMessage('not_exists')).toBeUndefined()
  })

  it('getDesignerMessage 支持显式 locales', () => {
    registry.setDesignerLanguage('zh-CN')

    expect(
      registry.getDesignerMessage('hello', {
        'zh-cn': { hello: '显式文案' },
      })
    ).toBe('显式文案')
  })

  it('registerDesignerIcons / getDesignerIcon 注册并读取图标', () => {
    registry.registerDesignerIcons({ Copy: 'icon-copy' })

    expect(registry.getDesignerIcon('Copy')).toBe('icon-copy')
    expect(registry.getDesignerIcon('Missing')).toBeUndefined()
  })

  it('setDesignerBehaviors 归一化行为宿主并按 selector 过滤', () => {
    const node = { id: 'node-1' } as any
    const matched = createBehavior('Matched', () => true)
    const unmatched = createBehavior('Unmatched', () => false)

    registry.setDesignerBehaviors([
      { Behavior: [matched] },
      [unmatched],
      { Behavior: [] },
      [] as any,
      null as any,
      { foo: 1 } as any,
    ])

    expect(registry.getDesignerBehaviors(node).map(behavior => behavior.name)).toEqual(['Matched'])
  })

  it('registerDesignerBehaviors 按依赖顺序排列并去重', () => {
    const node = { id: 'node-1' } as any
    const dependency = createBehavior('Dependency')
    const child = { ...createBehavior('Child'), extends: ['Dependency'] }

    registry.registerDesignerBehaviors({
      pkg: { Behavior: [child, dependency] },
    })

    expect(registry.getDesignerBehaviors(node).map(behavior => behavior.name)).toEqual(['Dependency', 'Child'])
  })

  it('registerDesignerBehaviors 缺少依赖时抛错', () => {
    expect(() =>
      registry.registerDesignerBehaviors({
        pkg: {
          Behavior: [{ ...createBehavior('Orphan'), extends: ['Missing'] }],
        },
      })
    ).toThrowError('No Missing behavior that Orphan depends on')
  })
})
