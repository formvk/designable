export { lowerSnake, mergeLocales, getBrowserLanguage } from '@formvk/designable-i18n'

/**
 * 统一的上报入口：异步事件回调与快捷键处理器中的 rejection 不应成为未处理异常。
 */
export const reportError = (error: unknown) => {
  console.error(error)
}
