import { KeyCode } from '@formvk/designable-shared'
import { isFn } from '@formvk/shared'

import { reportError } from '../internals'
import type { IEngineContext } from '../types'
import { DESIGNER_PIPELINES } from './Pipeline'
import type { IShortcutContext, MaybePromise } from './Pipeline'

export { KeyCode }

export interface IShortcutProps {
  codes: KeyCode[] | KeyCode[][]
  matcher?: (codes: KeyCode[]) => boolean
  handler?: (context: IEngineContext) => MaybePromise<void>
}

export class Shortcut {
  codes: KeyCode[][]
  handler?: (context: IEngineContext) => MaybePromise<void>
  matcher?: (codes: KeyCode[]) => boolean
  constructor(props: IShortcutProps) {
    this.codes = this.parseCodes(props.codes)
    this.handler = props.handler
    this.matcher = props.matcher
  }

  parseCodes(codes: Array<KeyCode | KeyCode[]>) {
    const results: KeyCode[][] = []
    codes.forEach(code => {
      if (Array.isArray(code)) {
        results.push(code)
      } else {
        results.push([code])
      }
    })
    return results
  }

  preventCodes(codes: KeyCode[]) {
    if (this.codes.length) {
      for (let i = 0; i < codes.length; i++) {
        const sequence = this.codes[i] ?? []
        for (let j = 0; j < sequence.length; j++) {
          if (!Shortcut.matchCode(codes[j], sequence[j])) {
            return false
          }
        }
      }
      return true
    }
    return false
  }

  matched(matched: boolean, context: IEngineContext) {
    const handler = this.handler
    if (isFn(handler) && matched) {
      const pipeline = context?.engine?.pipeline
      // 匹配保持同步以维持 preventDefault 时序，处理器异步执行并统一上报错误
      if (pipeline) {
        const pipelineContext: IShortcutContext = {
          engine: context.engine,
          shortcut: this,
          context,
        }
        void pipeline
          .run(DESIGNER_PIPELINES.shortcut, pipelineContext, async () => {
            pipelineContext.executed = true
            await handler(context)
          })
          .catch(reportError)
      } else {
        void (async () => {
          await handler(context)
        })().catch(reportError)
      }
    }
    return matched
  }

  match(codes: KeyCode[], context: IEngineContext) {
    return this.codes.some(sequence => {
      const sortedSelf = Shortcut.sortCodes(sequence)
      const sortedTarget: KeyCode[] = Shortcut.sortCodes(codes)
      if (isFn(this.matcher)) {
        return this.matched(this.matcher(sortedTarget), context)
      }
      if (sortedTarget.length !== sortedSelf.length) return this.matched(false, context)
      for (let i = 0; i < sortedSelf.length; i++) {
        if (!Shortcut.matchCode(sortedTarget[i], sortedSelf[i])) {
          return this.matched(false, context)
        }
      }
      return this.matched(true, context)
    })
  }

  static matchCode = (code1: KeyCode, code2: KeyCode) => {
    return code1?.toLocaleLowerCase?.() === code2?.toLocaleLowerCase?.()
  }

  static sortCodes = (codes: KeyCode[]): KeyCode[] => {
    return codes.map(code => code.toLocaleLowerCase()).sort() as any
  }
}
