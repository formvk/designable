import type { I18nVariables } from './types'

/**
 * 将 `{name}` 占位符替换为变量值，缺失变量保持原样。
 */
export const formatMessage = (message: string, variables?: I18nVariables) => {
  if (!variables) return message
  return message.replace(/\{([^{}]+)\}/g, (matched, key: string) => {
    const value = variables[key]
    return value === undefined ? matched : String(value)
  })
}
