import { autorun } from '@formvk/reactive'
import { describe, expect, it, vi } from 'vitest'

import {
  createI18n,
  findLocale,
  formatMessage,
  getBrowserLanguage,
  getISOCode,
  I18n,
  lowerSnake,
  mergeLocales,
  resolveMessage,
} from '../index'

describe('locale', () => {
  it('lowerSnake 仅将空白转下划线并小写，不拆分驼峰', () => {
    expect(lowerSnake('Hello World')).toBe('hello_world')
    expect(lowerSnake('fooBar')).toBe('foobar')
  })

  it('mergeLocales 递归合并并规范化 key', () => {
    const target = { 'zh-cn': { nested: { a: 'a' } } }
    const result = mergeLocales(target, {
      'zh-CN': { Nested: { B: 'b' }, 'User Name': '用户名' },
    })

    expect(result).toEqual({
      'zh-cn': { nested: { a: 'a', b: 'b' }, user_name: '用户名' },
    })
    expect(result).toBe(target)
  })

  it('mergeLocales 从空值创建新对象', () => {
    expect(mergeLocales(undefined, { Foo: { Bar: 1 } })).toEqual({ foo: { bar: 1 } })
  })

  it('getISOCode 精确匹配、模糊匹配与回退', () => {
    const locales = { 'zh-cn': {}, 'en-us': {} }

    expect(getISOCode('zh-CN', locales)).toBe('zh-cn')
    expect(getISOCode('zh', locales)).toBe('zh-cn')
    expect(getISOCode('en', locales)).toBe('en-us')
    expect(getISOCode('de-DE', locales)).toBe('de-DE')
    expect(getISOCode('', locales)).toBe('')
  })

  it('findLocale 忽略 key 大小写', () => {
    expect(findLocale({ 'zh-CN': { hello: '你好' } }, 'zh-cn')).toEqual({ hello: '你好' })
    expect(findLocale(undefined, 'zh-cn')).toBeUndefined()
  })

  it('resolveMessage 支持路径读取', () => {
    expect(resolveMessage({ nested: { title: '标题' } }, 'Nested.Title')).toBe('标题')
    expect(resolveMessage({ nested: {} }, 'Nested.Missing')).toBeUndefined()
    expect(resolveMessage(undefined, 'Nested.Title')).toBeUndefined()
  })

  it('getBrowserLanguage 返回浏览器语言', () => {
    expect(typeof getBrowserLanguage()).toBe('string')
  })

  it('formatMessage 替换占位符并保留缺失变量', () => {
    expect(formatMessage('你好 {name}', { name: 'Designable' })).toBe('你好 Designable')
    expect(formatMessage('你好 {name}', {})).toBe('你好 {name}')
    expect(formatMessage('你好', { name: 'x' })).toBe('你好')
  })
})

describe('createI18n', () => {
  const locales = {
    'zh-CN': { Hello: '你好', 'User Name': '用户名', Nested: { Title: '标题' } },
    'en-US': { Hello: 'Hello' },
  }

  it('t 按当前语言、路径与插值取值', () => {
    const i18n = createI18n({ language: 'zh-CN', fallbackLanguage: 'en-US', locales })

    expect(i18n.getLanguage()).toBe('zh-cn')
    expect(i18n.t('Hello')).toBe('你好')
    expect(i18n.t('user name')).toBe('用户名')
    expect(i18n.t('Nested.Title')).toBe('标题')
    expect(i18n.t('missing', { name: 'x' }, '默认 {name}')).toBe('默认 x')
    expect(i18n.t('missing')).toBe('missing')
  })

  it('t 依次回退到 fallback 语言与其他语言', () => {
    const fallback = createI18n({ language: 'ja-JP', fallbackLanguage: 'en-US', locales })
    expect(fallback.t('Hello')).toBe('Hello')

    const other = createI18n({ language: 'ja-JP', locales })
    expect(other.t('user name')).toBe('用户名')
  })

  it('getMessage 保持 core 旧行为：当前语言包存在时只查当前包', () => {
    const i18n = createI18n({ language: 'zh-CN', locales })

    expect(i18n.getMessage('hello')).toBe('你好')
    expect(i18n.getMessage('not_exists')).toBeUndefined()

    i18n.setLanguage('de-DE')
    expect(i18n.getMessage('hello')).toBe('你好')
    expect(i18n.getMessage('hello', { 'zh-cn': { hello: '显式文案' } })).toBe('显式文案')
  })

  it('registerLocale / registerLocales 合并文案并触发订阅', () => {
    const i18n = createI18n({ language: 'zh-CN' })
    const subscriber = vi.fn()
    i18n.subscribe(subscriber)

    i18n.registerLocale('zh-CN', { Hello: '你好' })
    expect(i18n.t('hello')).toBe('你好')
    expect(subscriber).toHaveBeenCalledTimes(1)

    i18n.registerLocales({ 'en-US': { Hello: 'Hello' } })
    expect(subscriber).toHaveBeenCalledTimes(2)
    expect(i18n.locales['en-us'].hello).toBe('Hello')
    expect(i18n.getLocale('en')).toEqual({ hello: 'Hello' })
  })

  it('I18n 类可直接实例化，language / locales 为响应式属性', () => {
    const i18n = new I18n({ language: 'zh-CN', locales })
    const messages: string[] = []
    const dispose = autorun(() => {
      messages.push(i18n.t('Hello'))
    })

    expect(i18n.language).toBe('zh-CN')
    expect(i18n.locales['zh-cn'].hello).toBe('你好')
    expect(messages).toEqual(['你好'])

    i18n.setLanguage('en-US')
    expect(messages).toEqual(['你好', 'Hello'])

    i18n.registerLocale('en-US', { Hello: 'Hi' })
    expect(messages).toEqual(['你好', 'Hello', 'Hi'])

    dispose()
  })

  it('setLanguage 相同语言不重复通知，dispose 清空订阅', () => {
    const i18n = createI18n({ language: 'zh-CN', locales })
    const subscriber = vi.fn()
    i18n.subscribe(subscriber)

    i18n.setLanguage('zh-CN')
    expect(subscriber).not.toHaveBeenCalled()

    i18n.setLanguage('en-US')
    expect(subscriber).toHaveBeenCalledTimes(1)
    expect(i18n.getLanguage()).toBe('en-us')

    i18n.dispose()
    i18n.setLanguage('zh-CN')
    expect(subscriber).toHaveBeenCalledTimes(1)
  })
})
