import { action, shallow, shallowRef } from '@formvk/reactive'

import type { Engine } from './Engine'
import { DESIGNER_PIPELINES } from './Pipeline'
import type { ICommandContext, MaybePromise } from './Pipeline'

export interface IHistoryProps<T> {
  engine?: Engine
  cancelSnapshot?: () => void
  onPush?: (item: T) => void
  onRedo?: (item: T) => void
  onUndo?: (item: T) => void
  onGoto?: (item: T) => void
}

export interface HistoryItem<T> {
  data: T
  type?: string
  timestamp: number
}

export interface ISerializable {
  from(json: any): MaybePromise<void> //导入数据
  serialize(): MaybePromise<any> //序列化模型，用于历史记录保存
  /**
   * 同步序列化，绕过 serialize 中间件，用于构造期初始快照等无法 await 的边界。
   * 契约：其输出必须是不依赖任何中间件转换的「规范原始格式」，且始终可被 from()
   * （含 deserialize 中间件）无损还原；serialize 中间件若改写格式，必须自行保证
   * 反序列化链路对原始格式透传，不得只处理改写后的格式。
   */
  serializeSync(): any
}

export class History<T extends ISerializable = any> {
  context: ISerializable
  props: IHistoryProps<HistoryItem<T>>
  @shallowRef accessor current = 0
  @shallow accessor history: HistoryItem<T>[] = []
  updateTimer = null
  maxSize = 100
  locking = false
  /** 命令串行队列：push/undo/redo/goTo 按调用顺序依次执行 */
  private tail: Promise<void> = Promise.resolve()

  constructor(context: T, props?: IHistoryProps<HistoryItem<T>>) {
    this.context = context
    this.props = props || {}
    this.seed()
  }

  list() {
    return this.history
  }

  /**
   * 构造期同步写入初始快照，保证 history 初始长度为 1。
   * 注意：seed 绕过 serialize 管道，保存的是 serializeSync() 的规范原始格式，
   * 与后续 push 的管道格式快照并存，恢复时统一经 from()/deserialize 管道还原。
   */
  private seed() {
    const item = {
      data: this.context.serializeSync(),
      timestamp: Date.now(),
    }
    this.history.push(item)
    this.current = this.history.length - 1
    if (this.props?.onPush) {
      this.props.onPush(item)
    }
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const result = this.tail.then(task)
    // 队列自身吞掉异常，避免一次失败阻断后续命令；调用方仍拿到原始 rejection
    this.tail = result.catch(() => {})
    return result
  }

  @action
  push(type?: string): Promise<void> {
    // 恢复过程中产生的快照直接丢弃，避免把中间态写入历史
    if (this.locking) return Promise.resolve()
    return this.enqueue(async () => {
      if (this.locking) return
      if (this.current < this.history.length - 1) {
        this.history = this.history.slice(0, this.current + 1)
      }
      const data = await this.context.serialize()
      const item = {
        data,
        timestamp: Date.now(),
        type,
      }
      this.current = this.history.length
      this.history.push(item)
      const overSizeCount = this.history.length - this.maxSize
      if (overSizeCount > 0) {
        this.history.splice(0, overSizeCount)
        this.current = this.history.length - 1
      }
      if (this.props?.onPush) {
        this.props.onPush(item)
      }
    })
  }

  get allowUndo() {
    return this.history.length > 0 && this.current - 1 >= 0
  }

  get allowRedo() {
    return this.history.length > this.current + 1
  }

  @action
  redo(): Promise<void> {
    return this.enqueue(async () => {
      if (!this.allowRedo) return
      this.props?.cancelSnapshot?.()
      const fallback = this.history[this.current + 1]
      const engine = this.props?.engine
      const apply = async (item: HistoryItem<T>) => {
        this.locking = true
        try {
          await this.context.from(item.data)
        } finally {
          this.locking = false
        }
        this.current++
        if (this.props?.onRedo) {
          this.props.onRedo(item)
        }
      }
      if (engine?.pipeline) {
        const context: ICommandContext<HistoryItem<T>> = {
          engine,
          action: 'redo',
          item: fallback,
          index: this.current + 1,
        }
        await engine.pipeline.run(DESIGNER_PIPELINES.command, context, () => apply(context.item ?? fallback))
        return
      }
      await apply(fallback)
    })
  }

  @action
  undo(): Promise<void> {
    return this.enqueue(async () => {
      if (!this.allowUndo) return
      this.props?.cancelSnapshot?.()
      const fallback = this.history[this.current - 1]
      const engine = this.props?.engine
      const apply = async (item: HistoryItem<T>) => {
        this.locking = true
        try {
          await this.context.from(item.data)
        } finally {
          this.locking = false
        }
        this.current--
        if (this.props?.onUndo) {
          this.props.onUndo(item)
        }
      }
      if (engine?.pipeline) {
        const context: ICommandContext<HistoryItem<T>> = {
          engine,
          action: 'undo',
          item: fallback,
          index: this.current - 1,
        }
        await engine.pipeline.run(DESIGNER_PIPELINES.command, context, () => apply(context.item ?? fallback))
        return
      }
      await apply(fallback)
    })
  }

  @action
  goTo(index: number): Promise<void> {
    return this.enqueue(async () => {
      this.props?.cancelSnapshot?.()
      const engine = this.props?.engine
      const apply = async (targetIndex: number, targetItem?: HistoryItem<T>) => {
        const item = targetItem ?? this.history[targetIndex]
        if (item) {
          this.locking = true
          try {
            await this.context.from(item.data)
          } finally {
            this.locking = false
          }
          this.current = targetIndex
          if (this.props?.onGoto) {
            this.props.onGoto(item)
          }
        }
      }
      if (engine?.pipeline) {
        const context: ICommandContext<HistoryItem<T>> = {
          engine,
          action: 'goto',
          index,
        }
        await engine.pipeline.run(DESIGNER_PIPELINES.command, context, () =>
          apply(context.index ?? index, context.item)
        )
        return
      }
      await apply(index)
    })
  }

  @action
  clear() {
    this.history = []
    this.current = 0
  }
}
