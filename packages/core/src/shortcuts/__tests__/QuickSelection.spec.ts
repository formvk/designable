import { describe, expect, it, vi } from 'vitest'

// 先加载 registry 以固定模块求值顺序，避免 models 与 shortcuts 之间的循环依赖
import '../../registry'
import { SelectNextNode, SelectPrevNode } from '../QuickSelection'

const createNode = (props: any = {}) => ({
  id: 'node',
  parent: undefined,
  next: undefined,
  previous: undefined,
  firstChild: undefined,
  lastChild: undefined,
  ...props,
})

const createContext = (selectedNode: any, last: string = selectedNode?.id) => {
  const selection = { last, select: vi.fn() }
  const tree = { findById: vi.fn(() => selectedNode) }
  return { context: { workspace: { operation: { tree, selection } } }, selection, tree }
}

describe('SelectPrevNode', () => {
  const run = (selectedNode: any, last?: string) => {
    const { context, selection } = createContext(selectedNode, last)
    SelectPrevNode.handler?.(context as any)
    return selection
  }

  it('选中前一个节点的最深末尾子节点', () => {
    const bottom = createNode({ id: 'bottom' })
    const child = createNode({ id: 'child', lastChild: bottom })
    const previous = createNode({ id: 'previous', lastChild: child })
    const selected = createNode({ id: 'selected', previous })

    const selection = run(selected)

    expect(selection.select).toHaveBeenCalledWith(bottom)
  })

  it('前一个节点没有子节点时直接选中它', () => {
    const previous = createNode({ id: 'previous' })
    const selected = createNode({ id: 'selected', previous })

    expect(run(selected).select).toHaveBeenCalledWith(previous)
  })

  it('没有前一个节点时选中父节点', () => {
    const parent = createNode({ id: 'parent' })
    const selected = createNode({ id: 'selected', parent })

    expect(run(selected).select).toHaveBeenCalledWith(parent)
  })

  it('没有前一个节点与父节点时选中自身最深子节点', () => {
    const deepest = createNode({ id: 'deepest' })
    const lastChild = createNode({ id: 'last-child', lastChild: deepest })
    const selected = createNode({ id: 'selected', lastChild })

    expect(run(selected).select).toHaveBeenCalledWith(deepest)
  })

  it('叶子根节点没有任何可选项', () => {
    expect(run(createNode({ id: 'selected' })).select).not.toHaveBeenCalled()
  })

  it('未找到选中节点或缺少操作对象时不处理', () => {
    const { context, selection } = createContext(undefined, 'missing')
    SelectPrevNode.handler?.(context as any)
    expect(selection.select).not.toHaveBeenCalled()

    const emptySelection = { select: vi.fn() }
    SelectPrevNode.handler?.({ workspace: undefined } as any)
    expect(emptySelection.select).not.toHaveBeenCalled()
  })
})

describe('SelectNextNode', () => {
  const run = (selectedNode: any) => {
    const { context, selection } = createContext(selectedNode)
    SelectNextNode.handler?.(context as any)
    return selection
  }

  it('优先选中第一个子节点', () => {
    const firstChild = createNode({ id: 'first-child' })
    const next = createNode({ id: 'next' })
    const selected = createNode({ id: 'selected', firstChild, next })

    expect(run(selected).select).toHaveBeenCalledWith(firstChild)
  })

  it('没有子节点时选中下一个节点', () => {
    const next = createNode({ id: 'next' })
    const selected = createNode({ id: 'selected', next })

    expect(run(selected).select).toHaveBeenCalledWith(next)
  })

  it('没有子节点与下一个节点时选中父级的下一个节点', () => {
    const uncle = createNode({ id: 'uncle' })
    const parent = createNode({ id: 'parent', next: uncle })
    const selected = createNode({ id: 'selected', parent })

    expect(run(selected).select).toHaveBeenCalledWith(uncle)
  })

  it('向上递归查找最近的兄弟节点', () => {
    const grandUncle = createNode({ id: 'grand-uncle' })
    const grandParent = createNode({ id: 'grand-parent', next: grandUncle })
    const parent = createNode({ id: 'parent', parent: grandParent })
    const selected = createNode({ id: 'selected', parent })

    expect(run(selected).select).toHaveBeenCalledWith(grandUncle)
  })

  it('没有父级时选中自身', () => {
    const selected = createNode({ id: 'selected' })

    expect(run(selected).select).toHaveBeenCalledWith(selected)
  })

  it('未找到选中节点或缺少操作对象时不处理', () => {
    const { context, selection } = createContext(undefined)
    SelectNextNode.handler?.(context as any)
    expect(selection.select).not.toHaveBeenCalled()

    expect(() => SelectNextNode.handler?.({ workspace: undefined } as any)).not.toThrow()
  })
})
