import { Rect } from '@formvk/designable-shared'
import { describe, expect, it, vi } from 'vitest'

import { Registry } from '../Registry'
import { TreeNode } from '../TreeNode'

const registry = new Registry()

registry.registerDesignerBehaviors({
  pkg: {
    Behavior: [
      {
        name: 'TestNodeBehavior',
        selector: (node: any) => node.componentName === 'TestNode',
        designerProps: {
          droppable: true,
          draggable: true,
          cloneable: true,
          translatable: { x: true, y: true },
          resizable: { width: true, height: true },
          allowSiblings: (_node: any, nodes: any[]) => nodes.length < 2,
          allowAppend: (_node: any, nodes: any[]) => nodes.length < 3,
        } as any,
        designerLocales: { 'zh-CN': { Hello: '你好' } },
      },
      {
        name: 'TestChildBehavior',
        selector: (node: any) => node.componentName === 'TestChild',
        designerProps: {
          droppable: true,
          resizable: { width: true },
          translatable: { x: true },
        } as any,
      },
      {
        name: 'ForbidBehavior',
        selector: (node: any) => node.componentName === 'Forbid',
        designerProps: { allowDrop: () => false },
      },
      {
        name: 'DragNodesBehavior',
        selector: (node: any) => node.componentName === 'DragNodes',
        designerProps: { draggable: true, getDragNodes: (node: any) => node.children },
      },
      {
        name: 'DropNodesBehavior',
        selector: (node: any) => node.componentName === 'DropNodes',
        designerProps: { getDropNodes: (_node: any, parent: any) => [parent] },
      },
    ],
  },
})

let uid = 0
const unique = (prefix: string) => `${prefix}-${++uid}`

const createMockOperation = () => ({
  engine: { registry },
  dispatch: vi.fn((_event: any, callback?: () => any) => callback?.()),
  runMutation: (task: () => any) => Promise.resolve(task()),
  snapshot: vi.fn(),
  selection: {
    remove: vi.fn(),
    has: vi.fn(() => false),
    select: vi.fn(),
    length: 0,
    first: undefined,
  },
  hover: { clear: vi.fn() },
  workspace: {},
  nodes: new Map(),
})

const createTree = async (operation?: any) => {
  const root = new TreeNode({ id: unique('root'), componentName: 'TestNode', props: {}, operation })
  const a = new TreeNode({ id: unique('a'), componentName: 'TestNode', props: { title: 'A' } })
  const b = new TreeNode({ id: unique('b'), componentName: 'TestNode', props: {} })
  const child = new TreeNode({ id: unique('child'), componentName: 'TestChild', props: {} })
  await root.append(a, b)
  await a.append(child)
  return { root, a, b, child }
}

const createOperation = async () => {
  const operation: any = createMockOperation()
  const root = new TreeNode({ id: unique('opRoot'), componentName: 'TestNode', operation } as any)
  operation.tree = root
  const node = new TreeNode({ id: unique('opNode'), componentName: 'TestNode', props: { a: 1 } })
  await root.append(node)
  return { operation, root, node }
}

describe('TreeNode', () => {
  it('构造节点并维护层级关系', async () => {
    const { root, a, child } = await createTree()

    expect(root.isRoot).toBe(true)
    expect(root.depth).toBe(0)
    expect(root.root).toBe(root)
    expect(root.isSourceNode).toBe(false)
    expect(root.operation).toBeUndefined()

    expect(a.isRoot).toBe(false)
    expect(a.depth).toBe(1)
    expect(a.parent).toBe(root)
    expect(a.root).toBe(root)
    expect(child.depth).toBe(2)
    expect(child.root).toBe(root)

    expect(new TreeNode(a as any)).toBe(a)
    expect(TreeNode.create({ id: unique('created'), componentName: 'TestNode', props: {} })).toBeInstanceOf(TreeNode)
    expect(TreeNode.findById(a.id)).toBe(a)
  })

  it('前后兄弟、索引与子节点访问', async () => {
    const { root, a, b, child } = await createTree()

    expect(a.previous).toBeUndefined()
    expect(a.next).toBe(b)
    expect(b.previous).toBe(a)
    expect(b.next).toBeUndefined()
    expect(a.index).toBe(0)
    expect(b.index).toBe(1)
    expect(a.siblings).toEqual([b])
    expect(root.siblings).toEqual([])
    expect(root.previous).toBeUndefined()
    expect(root.next).toBeUndefined()
    expect(root.index).toBe(0)

    expect(root.firstChild).toBe(a)
    expect(root.lastChild).toBe(b)
    expect(a.firstChild).toBe(child)
    expect(a.lastChild).toBe(child)
    expect(root.descendants).toEqual([a, child, b])
    expect(child.descendants).toEqual([])
  })

  it('getParents / getParentByDepth 支持回溯祖先', async () => {
    const { root, a, child } = await createTree()

    expect(child.getParents()).toEqual([a, root])
    expect(child.getParentByDepth(1)).toBe(a)
    expect(child.getParentByDepth(0)).toBe(root)
    expect(child.getParentByDepth(5)).toBeUndefined()
    expect(root.getParents()).toEqual([])
  })

  it('find / findAll / contains / distanceTo / crossSiblings', async () => {
    const { root, a, b, child } = await createTree()

    expect(root.find(node => node.id === 'missing')).toBeUndefined()
    expect(root.find(node => node.id === root.id)).toBe(root)
    expect(root.find(node => node.id === child.id)).toBe(child)
    expect(root.findAll(node => node.componentName === 'TestNode')).toEqual([root, a, b])
    expect(root.findAll(() => false)).toEqual([])

    expect(root.contains(a, b)).toBe(true)
    expect(root.contains(child)).toBe(true)
    expect(a.contains(child)).toBe(true)
    expect(b.contains(child)).toBe(false)
    expect(root.contains(root)).toBe(true)

    expect(a.distanceTo(b)).toBe(1)
    expect(a.distanceTo(child)).toBe(Infinity)
    expect(a.distanceTo((await createTree()).a)).toBe(Infinity)

    const p = new TreeNode({ id: unique('p'), componentName: 'TestNode', props: {} })
    const x = new TreeNode({ id: unique('x'), componentName: 'TestNode', props: {} })
    const y = new TreeNode({ id: unique('y'), componentName: 'TestNode', props: {} })
    const z = new TreeNode({ id: unique('z'), componentName: 'TestNode', props: {} })
    await p.append(x, y, z)

    expect(x.crossSiblings(z)).toEqual([y])
    expect(x.crossSiblings(y)).toEqual([])
    expect(x.crossSiblings(a)).toEqual([])
  })

  it('isMyAncestor / isMyChild 系列判定', async () => {
    const { root, a, b, child } = await createTree()

    expect(child.isMyAncestor(root)).toBe(true)
    expect(child.isMyAncestor(child)).toBe(false)
    expect(child.isMyAncestor(a)).toBe(false)

    expect(a.isMyParent(root)).toBe(true)
    expect(a.isMyParents(root)).toBe(true)
    expect(a.isMyParents(a)).toBe(false)
    expect(a.isMyParents(child)).toBe(false)

    expect(root.isMyChild(a)).toBe(true)
    expect(root.isMyChild(child)).toBe(false)
    expect(root.isMyChildren(child)).toBe(true)
    expect(b.isMyChildren(child)).toBe(false)
  })

  it('allow* 方法依据设计器属性判定', async () => {
    const { root, a, b, child } = await createTree(createMockOperation())
    const forbid = new TreeNode({ id: unique('forbid'), componentName: 'Forbid', props: {} }, root)

    expect(a.designerProps.droppable).toBe(true)
    expect(a.allowAppend([b])).toBe(true)
    expect(a.allowAppend([b, child, root])).toBe(false)
    expect(a.allowAppend([forbid])).toBe(false)
    expect(root.allowAppend([a])).toBe(true)

    expect(a.allowSibling([b])).toBe(true)
    expect(a.allowSibling([b, child])).toBe(false)

    expect(a.allowDrop(b)).toBe(true)
    expect(forbid.allowDrop(a)).toBe(false)
    expect(root.allowDrag()).toBe(false)
    expect(a.allowDrag()).toBe(true)
    expect(a.allowClone()).toBe(true)
    expect(root.allowClone()).toBe(false)
    expect(a.allowResize()).toEqual(['x', 'y'])
    expect(child.allowResize()).toEqual(['x'])
    expect(root.allowResize()).toBe(false)
    expect(a.allowRotate()).toBeUndefined()
    expect(a.allowRound()).toBeUndefined()
    expect(a.allowScale()).toBeUndefined()
    expect(a.allowTranslate()).toBe(true)
    expect(child.allowTranslate()).toBe(false)
    expect(root.allowTranslate()).toBe(false)
    expect(a.allowDelete()).toBe(true)
    expect(root.allowDelete()).toBe(false)
  })

  it('designerLocales / getMessage 合并多语言文案', async () => {
    const { a } = await createTree(createMockOperation())
    registry.registerDesignerLocales({ 'zh-CN': { Other: '其他' } })
    registry.setDesignerLanguage('zh-CN')

    expect(a.designerLocales).toEqual({ 'zh-cn': { hello: '你好' } })
    expect(a.getMessage('hello')).toBe('你好')
  })

  it('setProps / setComponentName 更新节点', async () => {
    const { a } = await createTree(createMockOperation())

    await a.setProps({ title: 'B', extra: 1 })
    expect(a.props).toMatchObject({ title: 'B', extra: 1 })

    a.setComponentName('TestChild')
    expect(a.componentName).toBe('TestChild')
    expect(a.allowResize()).toEqual(['x'])
  })

  it('append / prepend / insertBefore / insertAfter / insertChildren / setChildren', async () => {
    const { root, a, b, child } = await createTree()
    const newNode = (name: string) => new TreeNode({ id: unique(name), componentName: 'TestNode', props: {} })

    expect(await a.append(root)).toEqual([])

    const c = newNode('c')
    const d = newNode('d')
    expect(await root.append(c, d)).toEqual([c, d])
    expect(root.children).toEqual([a, b, c, d])

    const e = newNode('e')
    expect(await root.prepend(e)).toEqual([e])
    expect(root.children).toEqual([e, a, b, c, d])

    const before = newNode('before')
    expect(await a.insertBefore(before)).toEqual([before])
    expect(root.children).toEqual([e, before, a, b, c, d])

    const after = newNode('after')
    expect(await a.insertAfter(after)).toEqual([after])
    expect(root.children).toEqual([e, before, a, after, b, c, d])

    const inserted = newNode('inserted')
    expect(await root.insertChildren(1, inserted)).toEqual([inserted])
    expect(root.children).toEqual([e, inserted, before, a, after, b, c, d])

    expect(await root.insertAfter(newNode('orphan'))).toEqual([])

    const x = newNode('x')
    const y = newNode('y')
    expect(await root.setChildren(x, y)).toEqual([x, y])
    expect(root.children).toEqual([x, y])
    expect(child.parent).toBe(a)
  })

  it('resetNodesParent 处理普通节点与来源节点', async () => {
    const { root } = await createTree()
    const normal = new TreeNode({ id: unique('normal'), componentName: 'TestNode', props: {} })
    expect(await root.append(normal)).toEqual([normal])
    expect(normal.parent).toBe(root)
    expect(normal.root).toBe(root)
    expect(normal.depth).toBe(1)

    const sourceRoot = new TreeNode({ id: unique('source'), isSourceNode: true, props: {} } as any)
    const sourceChild = new TreeNode({ id: unique('sourceChild'), componentName: 'TestNode', props: {} }, sourceRoot)
    const appended = await root.append(sourceChild)
    expect(appended).toHaveLength(1)
    expect(appended[0]).not.toBe(sourceChild)
    expect(appended[0].componentName).toBe('TestNode')
  })

  it('remove 从父级移除并清理注册表', async () => {
    const { root, a, b } = await createTree()

    await a.remove()
    expect(root.children).toEqual([b])
    expect(TreeNode.findById(a.id)).toBeUndefined()

    await TreeNode.remove([root, b])
    expect(root.children).toEqual([])
    expect(TreeNode.findById(b.id)).toBeUndefined()
  })

  it('clone 深拷贝节点与子节点', async () => {
    const { a, child } = await createTree()
    const cloned = await a.clone()

    expect(cloned).not.toBe(a)
    expect(cloned.id).not.toBe(a.id)
    expect(cloned.componentName).toBe(a.componentName)
    expect(cloned.props).toEqual(a.props)
    expect(cloned.parent).toBe(a.parent)
    expect(cloned.children).toHaveLength(1)
    expect(cloned.children[0].id).not.toBe(child.id)
    expect(cloned.children[0].parent).toBe(cloned)

    const otherParent = new TreeNode({ id: unique('other'), componentName: 'TestNode', props: {} })
    expect((await a.clone(otherParent)).parent).toBe(otherParent)
  })

  it('serialize / serializeSync / from 支持序列化与反序列化', async () => {
    const { a, child } = await createTree()
    const serialized = await a.serialize()

    expect(serialized.id).toBe(a.id)
    expect(serialized.componentName).toBe(a.componentName)
    expect(serialized.props).toEqual({ title: 'A' })
    expect(serialized.children![0].id).toBe(child.id)
    expect(a.serializeSync()).toMatchObject({ id: a.id, componentName: a.componentName })

    const node = new TreeNode({ id: unique('from'), componentName: 'TestNode', props: {} })
    await node.from({
      id: unique('fromSource'),
      componentName: 'TestChild',
      props: { b: 2 },
      hidden: true,
      children: [{ id: unique('fromChild'), componentName: 'TestNode', props: {} }],
    })

    expect(node.componentName).toBe('TestChild')
    expect(node.props).toEqual({ b: 2 })
    expect(node.hidden).toBe(true)
    expect(node.children).toHaveLength(1)
    expect(node.children[0].parent).toBe(node)
    expect(TreeNode.findById(node.id)).toBe(node)
  })

  it('eachTree / eachChildren 支持中断遍历', async () => {
    const { root, a, child, b } = await createTree()
    const visited: string[] = []

    root.eachTree(node => {
      visited.push(node.id)
    })
    expect(visited).toEqual([root.id, a.id, child.id, b.id])

    const stopped: string[] = []
    root.eachChildren(node => {
      stopped.push(node.id)
      if (node.id === a.id) return false
    })
    expect(stopped).toEqual([a.id])

    expect(() => root.eachTree(undefined as any)).not.toThrow()
    expect(() => root.eachChildren('invalid' as any)).not.toThrow()
  })

  it('静态过滤方法依据节点能力筛选', async () => {
    const { root, a, b, child } = await createTree(createMockOperation())
    const forbid = new TreeNode({
      id: unique('forbid'),
      componentName: 'Forbid',
      props: {},
      operation: createMockOperation(),
    } as any)
    const detached = new TreeNode({
      id: unique('detached'),
      componentName: 'TestNode',
      props: {},
      operation: createMockOperation(),
    } as any)
    const dragNodes = new TreeNode(
      {
        id: unique('dragNodes'),
        componentName: 'DragNodes',
        children: [b],
      } as any,
      detached
    )
    const dropNodes = new TreeNode({ id: unique('dropNodes'), componentName: 'DropNodes', props: {} }, detached)
    const resource = new TreeNode(
      {
        id: unique('resource'),
        componentName: '$$ResourceNode$$',
        children: [a, b],
      } as any,
      detached
    )

    expect(TreeNode.filterResizable([a, child, forbid])).toEqual([a, child])
    expect(TreeNode.filterRotatable([a])).toEqual([])
    expect(TreeNode.filterScalable([a])).toEqual([])
    expect(TreeNode.filterRoundable([a])).toEqual([])
    expect(TreeNode.filterTranslatable([a, child])).toEqual([a])
    expect(TreeNode.filterDraggable([root, a, forbid])).toEqual([a])
    expect(TreeNode.filterDraggable([dragNodes])).toEqual([b])
    expect(TreeNode.filterDraggable([resource])).toEqual([a, b])
    expect(await TreeNode.filterDroppable([a, forbid], root)).toEqual([a])
    expect(await TreeNode.filterDroppable([a, dropNodes], root)).toEqual([a, root])
    expect(await TreeNode.filterDroppable([resource], root)).toEqual([a, b])
    expect(TreeNode.sort([b, a].slice()).map(node => node.id)).toEqual([a.id, b.id])
  })

  it('operation 存在时派发事件并记录快照', async () => {
    const { operation, node } = await createOperation()

    expect(node.operation).toBe(operation)
    await node.setProps({ a: 2 })
    expect(node.props.a).toBe(2)
    expect(operation.dispatch).toHaveBeenCalled()
    expect(operation.snapshot).toHaveBeenCalledWith('update:node:props')

    node.takeSnapshot('manual')
    expect(operation.snapshot).toHaveBeenLastCalledWith('manual')
  })

  it('元素与布局查询转发到视口', async () => {
    const { operation, node } = await createOperation()
    const element = document.createElement('div')
    const rect = new Rect(0, 0, 10, 10)
    const viewport = {
      findElementById: vi.fn(() => element),
      getValidNodeElement: vi.fn(() => element),
      getElementRect: vi.fn(() => rect),
      getValidNodeRect: vi.fn(() => rect),
      getElementOffsetRect: vi.fn(() => rect),
      getValidNodeOffsetRect: vi.fn(() => rect),
      getValidNodeLayout: vi.fn(() => 'vertical'),
    }
    operation.workspace = { viewport, outline: undefined }

    expect(node.getElement()).toBe(element)
    expect(node.getValidElement()).toBe(element)
    expect(node.getElementRect()).toBe(rect)
    expect(node.getValidElementRect()).toBe(rect)
    expect(node.getElementOffsetRect()).toBe(rect)
    expect(node.getValidElementOffsetRect()).toBe(rect)
    expect(node.moveLayout).toBe('vertical')
    expect(viewport.getValidNodeLayout).toHaveBeenCalledWith(node)

    expect(node.getElement('outline')).toBeUndefined()
    expect(node.getValidElementRect('outline')).toBeUndefined()

    viewport.findElementById = vi.fn(() => undefined) as any
    expect(node.getElement()).toBeUndefined()
    expect(node.getElementRect()).toBeUndefined()
    expect(node.getElementOffsetRect()).toBeUndefined()
  })

  it('triggerMutation 在没有 operation 时直接执行回调', async () => {
    const { a } = await createTree()
    const callback = vi.fn(() => 'result')

    expect(await a.triggerMutation({ type: 'custom' }, callback)).toBe('result')
    expect(callback).toHaveBeenCalled()
    expect(await a.triggerMutation({ type: 'custom' }, undefined, 'default')).toBe('default')
  })

  it('静态 clone 复制选中的节点', async () => {
    const { operation, root, node } = await createOperation()
    operation.selection.has = vi.fn(() => true)

    await TreeNode.clone([node])

    expect(root.children).toHaveLength(2)
    expect(root.children[0]).toBe(node)
    expect(root.children[1]).not.toBe(node)
    expect(root.children[1].componentName).toBe('TestNode')
  })

  it('并发 append 时两个节点都保留', async () => {
    const { a } = await createTree()
    const x = new TreeNode({ id: unique('x'), componentName: 'TestNode', props: {} })
    const y = new TreeNode({ id: unique('y'), componentName: 'TestNode', props: {} })

    await Promise.all([a.append(x), a.append(y)])

    expect(a.children).toContain(x)
    expect(a.children).toContain(y)
  })
})
