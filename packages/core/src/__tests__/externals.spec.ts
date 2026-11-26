import { describe, expect, it } from 'vitest'

import {
  createBehavior,
  createDesigner,
  createLocales,
  createResource,
  isBehavior,
  isBehaviorHost,
  isBehaviorList,
  isResource,
  isResourceHost,
  isResourceList,
} from '../externals'
import { TreeNode } from '../models/TreeNode'
import { DEFAULT_DRIVERS, DEFAULT_EFFECTS, DEFAULT_SHORTCUTS } from '../presets'

describe('externals', () => {
  it('isBehaviorHost / isBehaviorList / isBehavior 判定行为', () => {
    const behavior = { name: 'A' }

    expect(isBehavior(behavior)).toBeTruthy()
    expect(isBehavior({ selector: () => true })).toBeTruthy()
    expect(isBehavior({ extends: ['A'] })).toBeTruthy()
    expect(isBehavior({ designerProps: {} })).toBeTruthy()
    expect(isBehavior({ designerLocales: {} })).toBeTruthy()
    expect(isBehavior({})).toBeFalsy()
    expect(isBehavior(null)).toBeFalsy()

    expect(isBehaviorList([behavior])).toBe(true)
    expect(isBehaviorList([{}])).toBe(false)
    expect(isBehaviorList('not-a-list')).toBe(false)

    expect(isBehaviorHost({ Behavior: [behavior] })).toBe(true)
    expect(isBehaviorHost({ Behavior: [] })).toBe(true)
    expect(isBehaviorHost({ Behavior: [{}] })).toBe(false)
    expect(isBehaviorHost({})).toBeFalsy()
  })

  it('isResourceHost / isResourceList / isResource 判定资源', () => {
    const node = new TreeNode({
      componentName: '$$ResourceNode$$',
      isSourceNode: true,
      props: {},
    })
    const resource = { node }

    expect(isResource(resource)).toBe(true)
    expect(isResource({ node: { isSourceNode: true } })).toBe(false)
    expect(isResource({})).toBeFalsy()
    expect(isResource(null)).toBeFalsy()

    expect(isResourceList([resource])).toBe(true)
    expect(isResourceList([{}])).toBe(false)
    expect(isResourceList('not-a-list')).toBe(false)

    expect(isResourceHost({ Resource: [resource] })).toBe(true)
    expect(isResourceHost({ Resource: [] })).toBe(true)
    expect(isResourceHost({ Resource: [{}] })).toBe(false)
    expect(isResourceHost({})).toBeFalsy()
  })

  it('createLocales 合并多包语言包', () => {
    const locales = createLocales(
      { 'zh-CN': { Hello: '你好' } },
      { 'zh-CN': { World: '世界' }, 'en-US': { Hello: 'Hello' } }
    )

    expect(locales).toEqual({
      'zh-cn': { hello: '你好', world: '世界' },
      'en-us': { hello: 'Hello' },
    })
  })

  it('createBehavior 扁平化数组并把字符串 selector 转为函数', () => {
    const fnBehavior = { name: 'Fn', selector: () => true }
    const stringBehavior = { name: 'Button', selector: 'Button' }
    const noSelector = { name: 'Skip' }

    const behaviors = createBehavior(stringBehavior as any, [[fnBehavior, noSelector]] as any)

    expect(behaviors.map(behavior => behavior.name)).toEqual(['Button', 'Fn'])
    expect(typeof behaviors[0].selector).toBe('function')
    expect(behaviors[0].selector({ componentName: 'Button' } as any)).toBe(true)
    expect(behaviors[0].selector({ componentName: 'Input' } as any)).toBe(false)
    expect(createBehavior()).toEqual([])
  })

  it('createResource 构造资源节点并保留类型与元素', () => {
    const typed = createResource('Form', {
      elements: [{ componentName: 'Input', props: {} }],
    })

    expect(typed).toHaveLength(1)
    expect(typed[0].type).toBe('Form')
    expect(typed[0].node.componentName).toBe('$$ResourceNode$$')
    expect(typed[0].node.isSourceNode).toBe(true)
    expect(typed[0].node.children).toHaveLength(1)
    expect(typed[0].node.children[0].componentName).toBe('Input')

    const untyped = createResource({ elements: [] })
    expect(untyped[0].type).toBe('Others')
    expect(untyped[0].node.children).toEqual([])
  })

  it('createDesigner 合并自定义与默认 presets', () => {
    const customEffect = () => {}
    const customShortcut = { codes: [], handler: () => {} } as any
    const engine = createDesigner({
      effects: [customEffect],
      shortcuts: [customShortcut],
    })

    expect(engine.props.effects).toHaveLength(DEFAULT_EFFECTS.length + 1)
    expect(engine.props.effects?.[0]).toBe(customEffect)
    expect(engine.props.drivers).toEqual(DEFAULT_DRIVERS)
    expect(engine.props.shortcuts).toHaveLength(DEFAULT_SHORTCUTS.length + 1)
    expect(engine.props.shortcuts?.[0]).toBe(customShortcut)

    const defaultEngine = createDesigner()
    expect(defaultEngine.props.drivers).toEqual(DEFAULT_DRIVERS)
    expect(defaultEngine.props.effects).toEqual(DEFAULT_EFFECTS)
    expect(defaultEngine.props.shortcuts).toEqual(DEFAULT_SHORTCUTS)
  })
})
