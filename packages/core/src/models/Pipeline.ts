import { uid } from '@formvk/shared'

import type { IEngineContext, WorkbenchTypes } from '../types'
import type { Engine } from './Engine'
import type { ClosestPosition } from './MoveHelper'
import type { Operation } from './Operation'
import type { Shortcut } from './Shortcut'
import type { ITreeNode, TreeNode } from './TreeNode'
import type { Workbench } from './Workbench'
import type { Workspace } from './Workspace'

/**
 * 内置管道名。插件可按动作类型注册洋葱中间件。
 */
export const DESIGNER_PIPELINES = {
  /** 节点变更（属性更新、结构变更、删除、克隆等） */
  nodeMutation: 'node.mutation',
  /** 命令（删除 / 克隆 / 撤销 / 重做 / 跳转） */
  command: 'command',
  /** 拖拽落点 */
  dragDrop: 'drag.drop',
  /** 序列化 */
  serialize: 'serialize',
  /** 反序列化 */
  deserialize: 'deserialize',
  /** 快捷键 */
  shortcut: 'shortcut',
  /** 工作台切换 */
  workbench: 'workbench',
} as const

export type DesignerPipelineName = (typeof DESIGNER_PIPELINES)[keyof typeof DESIGNER_PIPELINES]

export type MaybePromise<T> = T | Promise<T>

export type PipelineNext<R> = () => Promise<R>

export type PipelineMiddleware<C = any, R = any> = (context: C, next: PipelineNext<R>) => MaybePromise<R | void>

export interface IPipelineUseOptions {
  /** 中间件标识，同 id 后注册覆盖先注册 */
  id?: string
  /** 排序权重，默认 0，升序执行 */
  order?: number
}

export interface INodeMutationContext<T = any> {
  engine: Engine
  workspace?: Workspace
  operation?: Operation
  node: TreeNode
  /** 原始变更事件，中间件可通过 event.data 改写变更参数 */
  event: any
  /** 终端执行结果 */
  result?: T
}

export type ICommandAction = 'remove' | 'clone' | 'undo' | 'redo' | 'goto'

export interface ICommandContext<T = any> {
  engine: Engine
  action: ICommandAction
  /** remove / clone 的目标节点，可被中间件改写 */
  nodes?: TreeNode[]
  /** undo / redo / goto 的目标历史项，可被中间件改写 */
  item?: T
  /** goto 的目标索引，可被中间件改写 */
  index?: number
  result?: any
}

export interface IDragDropContext {
  engine: Engine
  workspace: Workspace
  /** 拖拽节点，可被中间件改写 */
  dragNodes: TreeNode[]
  /** 落点节点，可被中间件改写 */
  node?: TreeNode
  /** 落点方位，可被中间件改写 */
  direction?: ClosestPosition
}

export interface ISerializeContext<T = any> {
  engine: Engine
  workspace?: Workspace
  operation?: Operation
  node: TreeNode
  result?: T
}

export interface IDeserializeContext {
  engine: Engine
  workspace?: Workspace
  operation?: Operation
  node: TreeNode
  /** 待反序列化的数据，可被中间件改写 */
  source?: ITreeNode
}

export interface IShortcutContext {
  engine: Engine
  shortcut: Shortcut
  context: IEngineContext
  /** 终端是否已执行 */
  executed?: boolean
}

export interface IWorkbenchContext {
  engine: Engine
  workbench: Workbench
  action: 'switch' | 'type'
  from?: Workspace
  /** 目标工作区 id 或实例，可被中间件改写 */
  to?: string | Workspace
  id?: string
  /** 目标工作台类型，可被中间件改写 */
  type?: WorkbenchTypes
}

interface IPipelineEntry {
  id: string
  order: number
  middleware: PipelineMiddleware
}

/**
 * 命名洋葱管道：按 order 升序执行中间件，`next()` 进入下一层，终端由调用方提供。
 * 全链路异步：中间件可同步或异步返回，`run` 始终返回 Promise。
 */
export class Pipeline {
  private groups = new Map<string, Map<string, IPipelineEntry>>()

  use<C = any, R = any>(
    name: string,
    middleware: PipelineMiddleware<C, R>,
    options: IPipelineUseOptions = {}
  ): () => void {
    const id = options.id ?? uid()
    const entry: IPipelineEntry = {
      id,
      order: options.order ?? 0,
      middleware,
    }
    const group = this.groups.get(name) ?? new Map<string, IPipelineEntry>()
    this.groups.set(name, group)
    // 同 id 覆盖：先删除再插入，保证排序按最新注册位置
    group.delete(id)
    group.set(id, entry)
    return () => {
      if (group.get(id) === entry) {
        group.delete(id)
      }
    }
  }

  has(name: string) {
    return !!this.groups.get(name)?.size
  }

  async run<C = any, R = any>(name: string, context: C, terminal: () => MaybePromise<R>): Promise<R> {
    const group = this.groups.get(name)
    if (!group?.size) {
      return terminal()
    }
    const entries = Array.from(group.values()).sort((before, after) => before.order - after.order)
    let cursor = -1
    // 游标检测在任何 await 之前完成，重复 next() 同步返回 rejected Promise
    const dispatch = (index: number): Promise<R> => {
      if (index <= cursor) {
        return Promise.reject(new Error(`Pipeline "${name}" next() called multiple times`))
      }
      cursor = index
      const entry = entries[index]
      if (!entry) {
        return Promise.resolve(terminal())
      }
      return (async () => {
        const result = await entry.middleware(context, () => dispatch(index + 1))
        return result as R
      })()
    }
    return dispatch(0)
  }

  clear(name?: string) {
    if (name) {
      this.groups.delete(name)
    } else {
      this.groups.clear()
    }
  }
}
