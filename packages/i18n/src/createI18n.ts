import { action, shallowRef } from '@formvk/reactive'

import { formatMessage } from './format'
import { findLocale, getBrowserLanguage, getISOCode, lowerSnake, mergeLocales, resolveMessage } from './locale'
import type { I18nVariables, II18nProps, ILocaleMessages, ILocales } from './types'

const findFirstMessage = (locales: ILocales, token: string) => {
  for (const key in locales) {
    const message = resolveMessage(locales[key], token)
    if (message !== undefined) return message
  }
}

/**
 * 框架无关的国际化内核。
 *
 * - 当前语言与语言包通过响应式 accessor 维护，UI 读取时自动建立依赖
 * - `t` 面向 UI：当前语言 -> 回退语言 -> 其他语言 -> defaultMessage -> token
 * - `getMessage` 保持与 core 旧行为兼容：当前语言包存在时只查当前语言包
 */
export class I18n {
  readonly fallbackLanguage: string

  @shallowRef accessor language: string = ''

  @shallowRef accessor locales: ILocales = {}

  private subscribers = new Set<() => void>()

  constructor(props: II18nProps = {}) {
    this.fallbackLanguage = lowerSnake(props.fallbackLanguage || 'en')
    this.language = props.language || getBrowserLanguage()
    this.locales = mergeLocales({}, props.locales || {})
  }

  getLanguage() {
    return getISOCode(this.language, this.locales)
  }

  getLocale(language?: string) {
    const isoCode = language === undefined ? this.getLanguage() : getISOCode(language, this.locales)
    return findLocale(this.locales, isoCode)
  }

  @action
  registerLocales(...packages: ILocales[]) {
    const next = { ...this.locales }
    packages.forEach(packageLocales => {
      if (packageLocales) mergeLocales(next, packageLocales)
    })
    this.locales = next
    this.notify()
  }

  @action
  registerLocale(language: string, messages: ILocaleMessages) {
    this.registerLocales({ [language]: messages })
  }

  @action
  setLanguage(nextLanguage: string) {
    if (this.language === nextLanguage) return
    this.language = nextLanguage
    this.notify()
  }

  getMessage(token: string, explicitLocales?: ILocales, defaultMessage?: string) {
    const source = explicitLocales || this.locales
    const locale = findLocale(source, getISOCode(this.language, source))
    if (locale) {
      const message = resolveMessage(locale, token)
      return message === undefined ? defaultMessage : message
    }
    return findFirstMessage(source, token) ?? defaultMessage
  }

  t(token: string, variables?: I18nVariables, defaultMessage?: string) {
    const locale = findLocale(this.locales, this.getLanguage())
    const message =
      resolveMessage(locale, token) ??
      resolveMessage(findLocale(this.locales, this.fallbackLanguage), token) ??
      findFirstMessage(this.locales, token)
    return formatMessage(String(message ?? defaultMessage ?? token), variables)
  }

  subscribe(subscriber: () => void) {
    this.subscribers.add(subscriber)
    return () => {
      this.subscribers.delete(subscriber)
    }
  }

  dispose() {
    this.subscribers.clear()
  }

  private notify() {
    this.subscribers.forEach(subscriber => subscriber())
  }
}

/**
 * 创建 i18n 实例，保持既有调用方式。
 */
export const createI18n = (props: II18nProps = {}): I18n => new I18n(props)
