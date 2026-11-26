import type { ICustomEvent } from '@formvk/designable-shared'
import { cancelIdle, requestIdle } from '@formvk/designable-shared'
import { isFn } from '@formvk/shared'

import { reportError } from '../internals'
import type { Engine } from './Engine'
import { Hover } from './Hover'
import { MoveHelper } from './MoveHelper'
import type { MaybePromise } from './Pipeline'
import { Selection } from './Selection'
import { TransformHelper } from './TransformHelper'
import type { ITreeNode } from './TreeNode'
import { TreeNode } from './TreeNode'
import type { Workspace } from './Workspace'

export interface IOperation {
  tree?: ITreeNode
  selected?: string[]
}

export class Operation {
  workspace: Workspace

  engine: Engine

  tree: TreeNode

  nodes = new Map<string, TreeNode>()

  selection: Selection

  hover: Hover

  transformHelper: TransformHelper

  moveHelper: MoveHelper

  requests = {
    snapshot: 0,
  }

  /**
   * 结构变更互斥队列的队尾 Promise。同一工作区的 node.mutation 按调用顺序串行执行：
   * 历史命令恢复（tree.from）在途时，后续结构变更排队等待，避免树状态与历史快照分叉。
   * 队列自身吞掉异常，保证一次失败不会阻断后续变更；调用方仍能拿到原始 rejection。
   */
  private mutationTail: Promise<unknown> = Promise.resolve()

  constructor(workspace: Workspace) {
    this.engine = workspace.engine
    this.workspace = workspace
    this.tree = new TreeNode({
      componentName: this.engine.props.rootComponentName,
      ...this.engine.props.defaultComponentTree,
      operation: this,
      props: this.engine.props.defaultComponentTree?.props || {},
    })
    this.hover = new Hover({
      operation: this,
    })
    this.selection = new Selection({
      operation: this,
    })
    this.moveHelper = new MoveHelper({
      operation: this,
    })
    this.transformHelper = new TransformHelper({
      operation: this,
    })
    this.selection.select(this.tree)
  }

  dispatch(event: ICustomEvent, callback?: () => MaybePromise<any>) {
    if (this.workspace.dispatch(event) === false) return
    if (isFn(callback)) return callback()
  }

  /**
   * 将一次结构变更放入互斥队列串行执行。
   * 不可重入：任务内部不得再次对同一 Operation 调用本方法，否则会自我等待形成死锁。
   */
  runMutation<T>(task: () => MaybePromise<T>): Promise<T> {
    const result = this.mutationTail.then(task, task)
    this.mutationTail = result.catch(() => {})
    return result
  }

  snapshot(type?: string) {
    cancelIdle(this.requests.snapshot)
    if (!this.workspace || !this.workspace.history || this.workspace.history.locking) return
    this.requests.snapshot = requestIdle(() => {
      void this.workspace.history.push(type).catch(reportError)
    })
  }

  cancelSnapshot() {
    cancelIdle(this.requests.snapshot)
  }

  async from(operation?: IOperation) {
    if (!operation) return
    if (operation.tree) {
      await this.tree.from(operation.tree)
    }
    if (operation.selected) {
      this.selection.selected = operation.selected
    }
  }

  async serialize(): Promise<IOperation> {
    return {
      tree: await this.tree.serialize(),
      selected: [this.tree.id],
    }
  }

  serializeSync(): IOperation {
    return {
      tree: this.tree.serializeSync(),
      selected: [this.tree.id],
    }
  }
}
