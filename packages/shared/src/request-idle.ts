import { globalThisPolyfill } from '@formvk/shared'

export interface IIdleDeadline {
  didTimeout: boolean
  timeRemaining: () => DOMHighResTimeStamp
}

export interface IdleCallbackOptions {
  timeout?: number
}

export const requestIdle = (callback: (params: IIdleDeadline) => void, options?: IdleCallbackOptions): number => {
  // Safari 至今未默认开启 requestIdleCallback，用 setTimeout 兜底
  if (typeof globalThisPolyfill.requestIdleCallback === 'function') {
    return globalThisPolyfill.requestIdleCallback(callback, options)
  }
  return globalThisPolyfill.setTimeout(() => {
    const start = Date.now()
    callback({
      didTimeout: false,
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    })
  }, 1)
}

export const cancelIdle = (id: number) => {
  if (typeof globalThisPolyfill.cancelIdleCallback === 'function') {
    globalThisPolyfill.cancelIdleCallback(id)
  } else {
    globalThisPolyfill.clearTimeout(id)
  }
}
