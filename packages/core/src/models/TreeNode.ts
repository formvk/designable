import { action, computed, reactive, shallow, shallowRef, toJS } from '@formvk/reactive'
import { uid, isFn, each } from '@formvk/shared'

import {
  InsertBeforeEvent,
  InsertAfterEvent,
  InsertChildrenEvent,
  PrependNodeEvent,
  AppendNodeEvent,
  WrapNodeEvent,
  UpdateChildrenEvent,
  RemoveNodeEvent,
  UpdateNodePropsEvent,
  CloneNodeEvent,
  FromNodeEvent,
} from '../events'
import { mergeLocales } from '../internals'
import type { IDesignerControllerProps, IDesignerProps, IDesignerLocales } from '../types'
import type { Operation } from './Operation'
import { DESIGNER_PIPELINES } from './Pipeline'
import type {
  ICommandContext,
  IDeserializeContext,
  INodeMutationContext,
  ISerializeContext,
  MaybePromise,
} from './Pipeline'

export interface ITreeNode {
  componentName: string
  sourceName?: string
  operation?: Operation
  hidden?: boolean
  isSourceNode?: boolean
  id?: string
  props: Record<string | number | symbol, any>
  children?: ITreeNode[]
}

export interface INodeFinder {
  (node: TreeNode): boolean
}

// 未归属工作空间的节点（资源节点、游离树）兜底索引
const TreeNodes = new Map<string, TreeNode>()

const CommonDesignerPropsMap = new Map<string, IDesignerControllerProps>()

// 按节点实际归属的 operation 注册索引：工作空间内节点进 operation.nodes，
// 资源节点等无 operation 的节点才进入全局表，避免不同工作空间同 id 互相覆盖
function registerNode(node: TreeNode) {
  const operation = node.root?.rootOperation
  if (operation) {
    TreeNodes.delete(node.id)
    operation.nodes.set(node.id, node)
  } else if (!TreeNodes.has(node.id)) {
    TreeNodes.set(node.id, node)
  }
}

const removeNode = (node: TreeNode) => {
  if (node.parent) {
    node.parent.children = node.parent.children.filter(child => child !== node)
  }
}

const resetNodesParent = async (nodes: TreeNode[], parent: TreeNode): Promise<TreeNode[]> => {
  const resetDepth = (node: TreeNode) => {
    node.depth = node.parent ? node.parent.depth + 1 : 0
    node.children.forEach(resetDepth)
  }

  const shallowReset = (node: TreeNode) => {
    node.parent = parent
    node.root = parent.root
    resetDepth(node)
  }

  const deepReset = async (node: TreeNode) => {
    shallowReset(node)
    await resetNodesParent(node.children, node)
  }

  const moveRegistration = (node: TreeNode, previousOperation?: Operation) => {
    const operation = node.root?.rootOperation
    if (previousOperation && previousOperation !== operation) {
      previousOperation.nodes.delete(node.id)
    }
    registerNode(node)
  }

  const results: TreeNode[] = []
  // 顺序 await，保证来源节点克隆后的顺序与传入一致
  for (let node of nodes) {
    if (node === parent) {
      results.push(node)
      continue
    }
    const previousOperation = node.root?.rootOperation
    if (!parent.isSourceNode) {
      if (node.isSourceNode) {
        node = await node.clone(parent)
        resetDepth(node)
        registerNode(node)
      } else if (!node.isRoot && node.isInOperation) {
        node.operation?.selection.remove(node)
        removeNode(node)
        shallowReset(node)
        moveRegistration(node, previousOperation)
      } else {
        await deepReset(node)
        moveRegistration(node, previousOperation)
      }
    } else {
      await deepReset(node)
      moveRegistration(node, previousOperation)
    }
    if (!CommonDesignerPropsMap.has(node.componentName)) {
      CommonDesignerPropsMap.set(node.componentName, node.designerProps)
    }
    results.push(node)
  }
  return results
}

const resetParent = async (node: TreeNode, parent: TreeNode) => {
  const [result] = await resetNodesParent([node], parent)
  return result
}

const resolveDesignerProps = (node: TreeNode, props: IDesignerControllerProps) => {
  if (isFn(props)) return props(node)
  return props
}

export class TreeNode {
  parent: TreeNode

  root: TreeNode

  rootOperation?: Operation

  id: string

  depth = 0

  @shallowRef accessor hidden = false

  @shallowRef accessor componentName = 'NO_NAME_COMPONENT'

  sourceName = ''

  @reactive accessor props: Required<ITreeNode>['props'] = {}

  @shallow accessor children: TreeNode[] = []

  isSelfSourceNode: boolean

  constructor(node: ITreeNode, parent?: TreeNode) {
    if (node instanceof TreeNode) {
      return node
    }
    this.id = node.id || uid()
    if (parent) {
      this.parent = parent
      this.depth = parent.depth + 1
      this.root = parent.root
    } else {
      this.root = this
      this.rootOperation = node.operation
      this.isSelfSourceNode = node.isSourceNode || false
    }
    registerNode(this)
    if (node) {
      // 构造阶段同步填充数据，不派发事件、不经过中间件
      this.applyNode(node)
    }
  }

  @computed
  get designerProps(): IDesignerProps {
    const behaviors = this.operation?.engine.registry.getDesignerBehaviors(this) ?? []
    const designerProps: IDesignerProps = behaviors.reduce((buf, pattern) => {
      if (!pattern.designerProps) return buf
      Object.assign(buf, resolveDesignerProps(this, pattern.designerProps))
      return buf
    }, {})
    return designerProps
  }

  @computed
  get designerLocales(): IDesignerLocales {
    const behaviors = this.operation?.engine.registry.getDesignerBehaviors(this) ?? []
    const designerLocales: IDesignerLocales = behaviors.reduce((buf, pattern) => {
      if (!pattern.designerLocales) return buf
      mergeLocales(buf, pattern.designerLocales)
      return buf
    }, {})
    return designerLocales
  }

  get previous() {
    if (this.parent === this || !this.parent) return
    return this.parent.children[this.index - 1]
  }

  get next() {
    if (this.parent === this || !this.parent) return
    return this.parent.children[this.index + 1]
  }

  get siblings() {
    if (this.parent) {
      return this.parent.children.filter(node => node !== this)
    }
    return []
  }

  get index() {
    if (this.parent === this || !this.parent) return 0
    return this.parent.children.indexOf(this)
  }

  get descendants(): TreeNode[] {
    return this.children.reduce<TreeNode[]>((buf, node) => {
      return buf.concat(node).concat(node.descendants)
    }, [])
  }

  get isRoot() {
    return this === this.root
  }

  get isInOperation() {
    return !!this.operation
  }

  get lastChild() {
    return this.children[this.children.length - 1]
  }

  get firstChild() {
    return this.children[0]
  }

  get isSourceNode() {
    return this.root.isSelfSourceNode
  }

  get operation() {
    return this.root?.rootOperation
  }

  get viewport() {
    return this.operation?.workspace?.viewport
  }

  get outline() {
    return this.operation?.workspace?.outline
  }

  get moveLayout() {
    return this.viewport?.getValidNodeLayout(this)
  }

  getElement(area: 'viewport' | 'outline' = 'viewport') {
    return this[area]?.findElementById(this.id)
  }

  getValidElement(area: 'viewport' | 'outline' = 'viewport') {
    return this[area]?.getValidNodeElement(this)
  }

  getElementRect(area: 'viewport' | 'outline' = 'viewport') {
    const element = this.getElement(area)
    if (!element) return
    return this[area]?.getElementRect(element)
  }

  getValidElementRect(area: 'viewport' | 'outline' = 'viewport') {
    return this[area]?.getValidNodeRect(this)
  }

  getElementOffsetRect(area: 'viewport' | 'outline' = 'viewport') {
    const element = this.getElement(area)
    if (!element) return
    return this[area]?.getElementOffsetRect(element)
  }

  getValidElementOffsetRect(area: 'viewport' | 'outline' = 'viewport') {
    return this[area]?.getValidNodeOffsetRect(this)
  }

  getPrevious(step = 1) {
    return this.parent.children[this.index - step]
  }

  getAfter(step = 1) {
    return this.parent.children[this.index + step]
  }

  getSibling(index = 0) {
    return this.parent.children[index]
  }

  getParents(node?: TreeNode): TreeNode[] {
    const _node = node || this
    return _node?.parent ? [_node.parent].concat(this.getParents(_node.parent)) : []
  }

  getParentByDepth(depth = 0) {
    let parent = this.parent
    if (parent?.depth === depth) {
      return parent
    } else {
      return parent?.getParentByDepth(depth)
    }
  }

  getMessage(token: string) {
    return this.operation?.engine.registry.getDesignerMessage(token, this.designerLocales)
  }

  isMyAncestor(node: TreeNode) {
    if (node === this || this.parent === node) return false
    return node.contains(this)
  }

  isMyParent(node: TreeNode) {
    return this.parent === node
  }

  isMyParents(node: TreeNode) {
    if (node === this) return false
    return this.isMyParent(node) || this.isMyAncestor(node)
  }

  isMyChild(node: TreeNode) {
    return node.isMyParent(this)
  }

  isMyChildren(node: TreeNode) {
    return node.isMyParents(this)
  }

  takeSnapshot(type?: string) {
    this.operation?.snapshot(type)
  }

  triggerMutation<T>(event: any, callback?: () => MaybePromise<T>, defaults?: T): Promise<T> {
    const operation = this.operation
    if (operation) {
      // 所有工作区内变更进入 Operation 互斥队列，保证历史恢复在途时不会并发改写树
      return operation.runMutation(() => this.executeMutation(event, callback, defaults))
    }
    if (isFn(callback)) {
      return Promise.resolve(callback() as MaybePromise<T>)
    }
    return Promise.resolve(defaults as T)
  }

  private async executeMutation<T>(event: any, callback?: () => MaybePromise<T>, defaults?: T): Promise<T> {
    const operation = this.operation
    if (operation) {
      const pipeline = operation.engine?.pipeline
      if (pipeline && operation.tree === this.root) {
        let executed = false
        const context: INodeMutationContext<T> = {
          engine: operation.engine,
          workspace: operation.workspace,
          operation,
          node: this,
          event,
        }
        const result = await pipeline.run(DESIGNER_PIPELINES.nodeMutation, context, async () => {
          executed = true
          context.result = (await operation.dispatch(event, callback)) as T
          return context.result
        })
        if (executed) {
          this.takeSnapshot(event?.type)
        }
        const value = context.result !== undefined ? context.result : result
        return (value ?? defaults) as T
      }
      const result = ((await operation.dispatch(event, callback)) as T) ?? defaults
      this.takeSnapshot(event?.type)
      return result as T
    } else if (isFn(callback)) {
      return (await callback()) as T
    }
    return defaults as T
  }

  private resolveMutationNodes(event: any, fallback: TreeNode[]): TreeNode[] {
    const source = event?.data?.source
    if (Array.isArray(source)) return source
    if (source instanceof TreeNode) return [source]
    return fallback
  }

  find(finder: INodeFinder): TreeNode | undefined {
    if (finder(this)) {
      return this
    } else {
      let result: TreeNode | undefined = undefined
      this.eachChildren(node => {
        if (finder(node)) {
          result = node
          return false
        }
      })
      return result
    }
  }

  findAll(finder: INodeFinder): TreeNode[] {
    const results: TreeNode[] = []
    if (finder(this)) {
      results.push(this)
    }
    this.eachChildren(node => {
      if (finder(node)) {
        results.push(node)
      }
    })
    return results
  }

  distanceTo(node: TreeNode) {
    if (this.root !== node.root) {
      return Infinity
    }
    if (this.parent !== node.parent) {
      return Infinity
    }
    return Math.abs(this.index - node.index)
  }

  crossSiblings(node: TreeNode): TreeNode[] {
    if (this.parent !== node.parent) return []
    const minIndex = Math.min(this.index, node.index)
    const maxIndex = Math.max(this.index, node.index)
    const results: TreeNode[] = []
    for (let i = minIndex + 1; i < maxIndex; i++) {
      results.push(this.parent.children[i])
    }
    return results
  }

  allowSibling(nodes: TreeNode[]) {
    if (this.designerProps?.allowSiblings?.(this, nodes) === false) return false
    return this.parent?.allowAppend(nodes)
  }

  allowDrop(parent: TreeNode) {
    if (!isFn(this.designerProps.allowDrop)) return true
    return this.designerProps.allowDrop(parent)
  }

  allowAppend(nodes: TreeNode[]) {
    if (!this.designerProps?.droppable) return false
    if (this.designerProps?.allowAppend?.(this, nodes) === false) return false
    if (nodes.some(node => !node.allowDrop(this))) return false
    if (this.root === this) return true
    return true
  }

  allowClone() {
    if (this === this.root) return false
    return this.designerProps.cloneable ?? true
  }

  allowDrag() {
    if (this === this.root && !this.isSourceNode) return false
    return this.designerProps.draggable ?? true
  }

  allowResize(): false | Array<'x' | 'y'> {
    if (this === this.root && !this.isSourceNode) return false
    const { resizable } = this.designerProps
    if (!resizable) return false
    if (resizable.width && resizable.height) return ['x', 'y']
    if (resizable.width) return ['x']
    return ['y']
  }

  allowRotate() {}

  allowRound() {}

  allowScale() {}

  allowTranslate(): boolean {
    if (this === this.root && !this.isSourceNode) return false
    const { translatable } = this.designerProps
    if (translatable?.x && translatable?.y) return true
    return false
  }

  allowDelete() {
    if (this === this.root) return false
    return this.designerProps.deletable ?? true
  }

  findById(id?: string) {
    if (!id) return
    if (this.id === id) return this
    const operation = this.root?.rootOperation
    if (operation) {
      return operation.nodes.get(id)
    }
    if (this.children?.length > 0) {
      return TreeNodes.get(id)
    }
  }

  contains(...nodes: TreeNode[]) {
    return nodes.every(node => {
      if (node === this || node?.parent === this || node?.getParentByDepth(this.depth) === this) {
        return true
      }
      return false
    })
  }

  eachTree(callback?: (node: TreeNode) => void | boolean) {
    if (isFn(callback)) {
      callback(this.root)
      this.root?.eachChildren(callback)
    }
  }

  eachChildren(callback?: (node: TreeNode) => void | boolean) {
    if (isFn(callback)) {
      for (let i = 0; i < this.children.length; i++) {
        const node = this.children[i]
        if (callback(node) === false) return
        node.eachChildren(callback)
      }
    }
  }

  async resetNodesParent(nodes: TreeNode[], parent: TreeNode) {
    return resetNodesParent(
      nodes.filter(node => node !== this),
      parent
    )
  }

  @action
  async setProps(props?: any) {
    return this.triggerMutation(
      new UpdateNodePropsEvent({
        target: this,
        source: [],
      }),
      () => {
        Object.assign(this.props, props)
      }
    )
  }

  @action
  setComponentName(componentName: string) {
    this.componentName = componentName
  }

  @action
  async prepend(...nodes: TreeNode[]) {
    if (!nodes.length) return []
    if (nodes.some(node => node.contains(this))) return []
    const event = new PrependNodeEvent({
      originSourceParents: nodes.map(node => node.parent),
      target: this,
      source: nodes,
    })
    return this.triggerMutation(event, async () => {
      const sourceNodes = this.resolveMutationNodes(event, nodes)
      event.data.originSourceParents = sourceNodes.map(node => node.parent)
      const newNodes = await this.resetNodesParent(sourceNodes, this)
      event.data.source = newNodes
      if (!newNodes.length) return []
      this.children = newNodes.concat(this.children)
      return newNodes
    }, [])
  }

  @action
  async append(...nodes: TreeNode[]) {
    if (!nodes.length) return []
    if (nodes.some(node => node.contains(this))) return []
    const event = new AppendNodeEvent({
      originSourceParents: nodes.map(node => node.parent),
      target: this,
      source: nodes,
    })
    return this.triggerMutation(event, async () => {
      const sourceNodes = this.resolveMutationNodes(event, nodes)
      event.data.originSourceParents = sourceNodes.map(node => node.parent)
      const newNodes = await this.resetNodesParent(sourceNodes, this)
      event.data.source = newNodes
      if (!newNodes.length) return []
      this.children = this.children.concat(newNodes)
      return newNodes
    }, [])
  }

  @action
  async wrap(wrapper: TreeNode) {
    if (wrapper === this) return
    const parent = this.parent
    return this.triggerMutation(
      new WrapNodeEvent({
        target: this,
        source: wrapper,
      }),
      async () => {
        await resetParent(this, wrapper)
        await resetParent(wrapper, parent)
        return wrapper
      }
    )
  }

  @action
  async insertAfter(...nodes: TreeNode[]) {
    const parent = this.parent
    if (!nodes.length) return []
    if (nodes.some(node => node.contains(this))) return []
    if (parent?.children?.length) {
      const event = new InsertAfterEvent({
        originSourceParents: nodes.map(node => node.parent),
        target: this,
        source: nodes,
      })

      return this.triggerMutation(event, async () => {
        const sourceNodes = this.resolveMutationNodes(event, nodes)
        event.data.originSourceParents = sourceNodes.map(node => node.parent)
        const newNodes = await this.resetNodesParent(sourceNodes, parent)
        event.data.source = newNodes
        if (!newNodes.length) return []
        parent.children = parent.children.reduce<TreeNode[]>((buf, node) => {
          if (node === this) {
            return buf.concat([node]).concat(newNodes)
          } else {
            return buf.concat([node])
          }
        }, [])
        return newNodes
      }, [])
    }
    return []
  }

  @action
  async insertBefore(...nodes: TreeNode[]) {
    const parent = this.parent
    if (!nodes.length) return []
    if (nodes.some(node => node.contains(this))) return []
    if (parent?.children?.length) {
      const event = new InsertBeforeEvent({
        originSourceParents: nodes.map(node => node.parent),
        target: this,
        source: nodes,
      })
      return this.triggerMutation(event, async () => {
        const sourceNodes = this.resolveMutationNodes(event, nodes)
        event.data.originSourceParents = sourceNodes.map(node => node.parent)
        const newNodes = await this.resetNodesParent(sourceNodes, parent)
        event.data.source = newNodes
        if (!newNodes.length) return []
        parent.children = parent.children.reduce<TreeNode[]>((buf, node) => {
          if (node === this) {
            return buf.concat(newNodes).concat([node])
          } else {
            return buf.concat([node])
          }
        }, [])
        return newNodes
      }, [])
    }
    return []
  }

  async insertChildren(start: number, ...nodes: TreeNode[]) {
    if (!nodes.length) return []
    if (nodes.some(node => node.contains(this))) return []
    if (this.children?.length) {
      const event = new InsertChildrenEvent({
        originSourceParents: nodes.map(node => node.parent),
        target: this,
        source: nodes,
      })
      return this.triggerMutation(event, async () => {
        const sourceNodes = this.resolveMutationNodes(event, nodes)
        event.data.originSourceParents = sourceNodes.map(node => node.parent)
        const newNodes = await this.resetNodesParent(sourceNodes, this)
        event.data.source = newNodes
        if (!newNodes.length) return []
        this.children = this.children.reduce<TreeNode[]>((buf, node, index) => {
          if (index === start) {
            return buf.concat(newNodes).concat([node])
          }
          return buf.concat([node])
        }, [])
        return newNodes
      }, [])
    }
    return []
  }

  @action
  async setChildren(...nodes: TreeNode[]) {
    const event = new UpdateChildrenEvent({
      originSourceParents: nodes.map(node => node.parent),
      target: this,
      source: nodes,
    })
    return this.triggerMutation(event, async () => {
      const sourceNodes = this.resolveMutationNodes(event, nodes)
      event.data.originSourceParents = sourceNodes.map(node => node.parent)
      const newNodes = await this.resetNodesParent(sourceNodes, this)
      event.data.source = newNodes
      this.children = newNodes
      return newNodes
    }, [])
  }

  /**
   * @deprecated
   * please use `setChildren`
   */
  setNodeChildren(...nodes: TreeNode[]) {
    return this.setChildren(...nodes)
  }

  @action
  async remove() {
    return this.triggerMutation(
      new RemoveNodeEvent({
        target: this,
        source: [],
      }),
      () => {
        const operation = this.root?.rootOperation
        removeNode(this)
        TreeNodes.delete(this.id)
        operation?.nodes.delete(this.id)
      }
    )
  }

  async clone(parent?: TreeNode) {
    const newNode = new TreeNode(
      {
        id: uid(),
        componentName: this.componentName,
        sourceName: this.sourceName,
        props: toJS(this.props),
        children: [],
      },
      parent ? parent : this.parent
    )
    const clonedChildren: TreeNode[] = []
    // 顺序克隆，避免异步 clone 时子节点顺序错乱
    for (const child of this.children) {
      clonedChildren.push(await child.clone(newNode))
    }
    newNode.children = await resetNodesParent(clonedChildren, newNode)
    return this.triggerMutation(
      new CloneNodeEvent({
        target: this,
        source: newNode,
      }),
      () => newNode
    )
  }

  from(node?: ITreeNode): Promise<void> {
    if (!node) return Promise.resolve()
    const operation = this.operation
    const pipeline = operation?.engine?.pipeline
    if (operation && pipeline && operation.tree === this) {
      // 整个反序列化管道（含中间件异步间隙）纳入变更互斥队列，
      // 保证历史恢复在途时外部变更只能排队，不能并发改写树
      return operation.runMutation(() => this.executeFrom(node)).then(() => undefined)
    }
    return this.triggerMutation(
      new FromNodeEvent({
        target: this,
        source: node,
      }),
      () => {
        this.applyNode(node)
      }
    ).then(() => undefined)
  }

  private executeFrom(node: ITreeNode) {
    const operation = this.operation
    if (!operation) return
    const context: IDeserializeContext = {
      engine: operation.engine,
      workspace: operation.workspace,
      operation,
      node: this,
      source: node,
    }
    return operation.engine?.pipeline?.run(DESIGNER_PIPELINES.deserialize, context, () => {
      const source = context.source ?? node
      // 已在互斥任务内，直接执行变更逻辑，避免重复入队造成自等待
      return this.executeMutation(
        new FromNodeEvent({
          target: this,
          source,
        }),
        () => {
          this.applyNode(source)
        }
      )
    })
  }

  private applyNode(node?: ITreeNode) {
    if (!node) return
    if (node.id && node.id !== this.id) {
      const operation = this.root?.rootOperation
      TreeNodes.delete(this.id)
      operation?.nodes.delete(this.id)
      this.id = node.id
      registerNode(this)
    }
    if (node.componentName) {
      this.componentName = node.componentName
    }
    this.props = node.props ?? {}
    if (node.hidden) {
      this.hidden = node.hidden
    }
    if (node.children) {
      this.children =
        node.children?.map?.(node => {
          return new TreeNode(node, this)
        }) || []
    }
  }

  async serialize(): Promise<ITreeNode> {
    const operation = this.operation
    const pipeline = operation?.engine?.pipeline
    if (pipeline && operation.tree === this) {
      const context: ISerializeContext<ITreeNode> = {
        engine: operation.engine,
        workspace: operation.workspace,
        operation,
        node: this,
      }
      const result = await pipeline.run(DESIGNER_PIPELINES.serialize, context, () => {
        context.result = context.node.serializeNode()
        return context.result
      })
      return context.result ?? result ?? this.serializeNode()
    }
    return this.serializeNode()
  }

  /**
   * 同步序列化：绕过 serialize 管道，仅用于无法 await 的同步边界（如 History 初始快照、JSON 展示）。
   */
  serializeSync(): ITreeNode {
    return this.serializeNode()
  }

  private serializeNode(): ITreeNode {
    return {
      id: this.id,
      componentName: this.componentName,
      sourceName: this.sourceName,
      props: toJS(this.props),
      hidden: this.hidden,
      children: this.children.map(treeNode => {
        return treeNode.serializeNode()
      }),
    }
  }

  static create(node: ITreeNode, parent?: TreeNode) {
    return new TreeNode(node, parent)
  }

  // 仅查询未归属工作空间的节点（资源节点/游离树），工作空间内节点请通过 operation.nodes 查询
  static findById(id: string) {
    return TreeNodes.get(id)
  }

  static async remove(nodes: TreeNode[] = []) {
    if (!nodes.length) return
    const engine = nodes.find(node => !!node.operation)?.operation?.engine
    const pipeline = engine?.pipeline
    const apply = async (targets: TreeNode[]) => {
      for (let i = targets.length - 1; i >= 0; i--) {
        const node = targets[i]
        if (node.allowDelete()) {
          const previous = node.previous
          const next = node.next
          await node.remove()
          node.operation?.selection.select(previous ? previous : next ? next : node.parent)
          node.operation?.hover.clear()
        }
      }
    }
    if (engine && pipeline) {
      const context: ICommandContext = {
        engine,
        action: 'remove',
        nodes,
      }
      await pipeline.run(DESIGNER_PIPELINES.command, context, () => apply(context.nodes ?? nodes))
      return
    }
    await apply(nodes)
  }

  static sort(nodes: TreeNode[] = []) {
    return nodes.sort((before, after) => {
      if (before.depth !== after.depth) return 0
      return before.index - after.index >= 0 ? 1 : -1
    })
  }

  static async clone(nodes: TreeNode[] = []) {
    if (!nodes.length) return
    const engine = nodes.find(node => !!node.operation)?.operation?.engine
    const pipeline = engine?.pipeline
    const apply = async (targets: TreeNode[]) => {
      const groups: { [parentId: string]: TreeNode[] } = {}
      const lastGroupNode: { [parentId: string]: TreeNode } = {}
      const filterNestedNode = TreeNode.sort(targets).filter(node => {
        return !targets.some(parent => {
          return node.isMyParents(parent)
        })
      })
      each(filterNestedNode, node => {
        if (node === node.root) return
        if (!node.allowClone()) return
        if (!node?.operation) return
        groups[node?.parent?.id] = groups[node?.parent?.id] || []
        groups[node?.parent?.id].push(node)
        if (lastGroupNode[node?.parent?.id]) {
          if (node.index > lastGroupNode[node?.parent?.id].index) {
            lastGroupNode[node?.parent?.id] = node
          }
        } else {
          lastGroupNode[node?.parent?.id] = node
        }
      })
      const parents = new Map<TreeNode, TreeNode[]>()
      for (const parentId of Object.keys(groups)) {
        const groupNodes = groups[parentId]
        const lastNode = lastGroupNode[parentId]
        let insertPoint = lastNode
        for (const node of groupNodes) {
          const cloned = await node.clone()
          if (!cloned) continue
          if (node.operation?.selection.has(node) && insertPoint.parent.allowAppend([cloned])) {
            await insertPoint.insertAfter(cloned)
            // 插入是异步的，必须在 await 之后重新读取下一个兄弟节点
            insertPoint = insertPoint.next
          } else if (node.operation?.selection.length === 1) {
            const targetNode = node.operation?.tree.findById(node.operation?.selection.first)
            if (targetNode) {
              let cloneNodes = parents.get(targetNode)
              if (!cloneNodes) {
                cloneNodes = []
                parents.set(targetNode, cloneNodes)
              }
              if (targetNode.allowAppend([cloned])) {
                cloneNodes.push(cloned)
              }
            }
          }
        }
      }
      for (const [target, groupNodes] of parents) {
        if (!groupNodes.length) continue
        await target.append(...groupNodes)
      }
    }
    if (engine && pipeline) {
      const context: ICommandContext = {
        engine,
        action: 'clone',
        nodes,
      }
      await pipeline.run(DESIGNER_PIPELINES.command, context, () => apply(context.nodes ?? nodes))
      return
    }
    await apply(nodes)
  }

  static filterResizable(nodes: TreeNode[] = []) {
    return nodes.filter(node => node.allowResize())
  }

  static filterRotatable(nodes: TreeNode[] = []) {
    return nodes.filter(node => node.allowRotate())
  }

  static filterScalable(nodes: TreeNode[] = []) {
    return nodes.filter(node => node.allowScale())
  }

  static filterRoundable(nodes: TreeNode[] = []) {
    return nodes.filter(node => node.allowRound())
  }

  static filterTranslatable(nodes: TreeNode[] = []) {
    return nodes.filter(node => node.allowTranslate())
  }

  static filterDraggable(nodes: TreeNode[] = []) {
    return nodes.reduce<TreeNode[]>((buf, node) => {
      if (!node.allowDrag()) return buf
      if (isFn(node?.designerProps?.getDragNodes)) {
        const transformed = node.designerProps.getDragNodes(node)
        return transformed ? buf.concat(transformed) : buf
      }
      if (node.componentName === '$$ResourceNode$$') return buf.concat(node.children)
      return buf.concat([node])
    }, [])
  }

  static async filterDroppable(nodes: TreeNode[] = [], parent: TreeNode) {
    const results: TreeNode[] = []
    for (const node of nodes) {
      if (!node.allowDrop(parent)) continue
      if (isFn(node.designerProps?.getDropNodes)) {
        const cloned = node.isSourceNode ? await node.clone(node.parent) : node
        const transformed = node.designerProps.getDropNodes(cloned, parent)
        if (transformed) {
          results.push(...(Array.isArray(transformed) ? transformed : [transformed]))
        }
        continue
      }
      if (node.componentName === '$$ResourceNode$$') {
        results.push(...node.children)
        continue
      }
      results.push(node)
    }
    return results
  }
}
