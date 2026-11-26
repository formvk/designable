import { globalThisPolyfill, each, isPlainObj } from '@formvk/shared'

import type { ILocaleMessages, ILocales } from './types'

export const lowerSnake = (str: string) => {
  return String(str).replace(/\s+/g, '_').toLocaleLowerCase()
}

export const mergeLocales = (target: any, source: any) => {
  if (isPlainObj(target) && isPlainObj(source)) {
    each(source, function (value, key) {
      const token = lowerSnake(key)
      const messages = mergeLocales(target[key] || target[token], value)
      target[token] = messages
    })
    return target
  } else if (isPlainObj(source)) {
    const result = Array.isArray(source) ? [] : {}
    each(source, function (value, key) {
      const messages = mergeLocales(undefined, value)
      result[lowerSnake(key)] = messages
    })
    return result
  }
  return source
}

export const getBrowserLanguage = () => {
  /* istanbul ignore next */
  if (!globalThisPolyfill.navigator) {
    return 'en'
  }
  return globalThisPolyfill.navigator['browserlanguage'] || globalThisPolyfill.navigator?.language || 'en'
}

export const findLocale = (locales: ILocales | undefined, isoCode: string) => {
  if (!locales) return
  if (locales[isoCode]) return locales[isoCode]
  for (const key in locales) {
    if (lowerSnake(key) === isoCode) {
      return locales[key]
    }
  }
}

/**
 * 语言码解析：精确匹配 -> 模糊匹配 -> 原样返回当前语言
 */
export const getISOCode = (language: string, locales: ILocales) => {
  const lang = lowerSnake(language)
  if (!lang) return language
  if (findLocale(locales, lang)) return lang
  let isoCode = language
  each(locales, (_, key: string) => {
    const token = lowerSnake(key)
    if (token.indexOf(lang) > -1 || lang.indexOf(token) > -1) {
      isoCode = token
      return false
    }
  })
  return isoCode
}

/**
 * 按 token 读取文案，token 支持 `a.b` 形式的路径。
 *
 * 仅返回值，不做语言回退——回退策略由 createI18n 决定。
 */
export const resolveMessage = (locale: ILocaleMessages | undefined, token: string): any => {
  if (!locale) return
  return lowerSnake(token)
    .split('.')
    .reduce<any>((messages, key) => {
      if (messages === undefined || messages === null) return
      return messages[key]
    }, locale)
}
