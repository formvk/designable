import type { Engine, IPipelineUseOptions, PipelineMiddleware } from '@formvk/designable-core'
import type { ComponentType } from 'react'

export interface IDesignerSlotEntry<P extends object = Record<string, unknown>> {
  /** 槽位条目唯一标识，同 id 后注册覆盖先注册 */
  id: string
  /** 排序权重，默认 0，升序渲染 */
  order?: number
  component: ComponentType<P>
}

export interface IDesignerSlotRegistry {
  register<P extends object>(name: string, entry: IDesignerSlotEntry<P>): () => void
  get(name: string): IDesignerSlotEntry<any>[]
  subscribe(listener: () => void): () => void
}

export interface IDesignerPipeline {
  use<C = any, R = any>(name: string, middleware: PipelineMiddleware<C, R>, options?: IPipelineUseOptions): () => void
  run<C = any, R = any>(name: string, context: C, terminal: () => R | Promise<R>): Promise<R>
  has(name: string): boolean
}

export interface IDesignerPluginContext {
  engine: Engine
  slots: IDesignerSlotRegistry
  pipeline: IDesignerPipeline
}

export interface IDesignerPlugin {
  /** 插件名，用于调试与去重 */
  name: string
  /** 挂载时执行，可返回清理函数 */
  setup(ctx: IDesignerPluginContext): void | (() => void)
}
