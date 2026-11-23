import { action, shallowRef } from '@formvk/reactive'

import { HoverNodeEvent } from '../events'
import type { Operation } from './Operation'
import type { TreeNode } from './TreeNode'

export interface IHoverProps {
  operation: Operation
}

export class Hover {
  @shallowRef accessor node: TreeNode | undefined
  operation?: Operation
  constructor(props?: IHoverProps) {
    this.operation = props?.operation
  }

  @action
  setHover(node?: TreeNode) {
    this.node = node
    this.trigger()
  }

  @action
  clear() {
    this.node = undefined
  }

  trigger() {
    if (this.operation && this.node) {
      return this.operation.dispatch(
        new HoverNodeEvent({
          target: this.operation.tree,
          source: this.node,
        })
      )
    }
  }
}
