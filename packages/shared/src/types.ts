import { getType, isNum } from '@formvk/shared'

/**
 * designable 专属类型判断：跨 iframe 场景下比 `instanceof` 更可靠
 */
export const isWindow = (obj: unknown): obj is Window => getType(obj) === '[object Window]'

export const isHTMLElement = (obj: any): obj is HTMLElement => {
  return obj?.['nodeName'] || obj?.['tagName']
}

export const isValidNumber = (val: any): val is number => !isNaN(val) && isNum(val)
