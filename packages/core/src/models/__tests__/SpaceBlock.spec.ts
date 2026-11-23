import { calcEdgeLinesOfRect, Rect } from '@formvk/designable-shared'
import { describe, expect, it, vi } from 'vitest'

import { SpaceBlock } from '../SpaceBlock'

const REFER_RECT = new Rect(100, 100, 100, 100)
const NEXT_RECT = new Rect(100, 60, 100, 40)
const DRAG_RECT = new Rect(0, 0, 100, 100)

const createHelper = (
  options: {
    referRect?: Rect
    dragRect?: Rect
    nextBlock?: SpaceBlock | null
  } = {}
) => {
  const referRect = options.referRect ?? REFER_RECT
  const dragRect = options.dragRect ?? DRAG_RECT
  return {
    getNodeRect: vi.fn(() => referRect),
    calcAroundSpaceBlocks: vi.fn(() => ({
      top: options.nextBlock,
      bottom: options.nextBlock,
      left: options.nextBlock,
      right: options.nextBlock,
    })),
    dragNodesRect: dragRect,
    dragNodesEdgeLines: calcEdgeLinesOfRect(dragRect),
  } as any
}

const createSnapLineBlock = (type: string, rect: Rect) => {
  const refer = { id: 'refer' } as any
  const nextBlock = new SpaceBlock(null as any, {
    refer,
    rect: NEXT_RECT,
    distance: 40,
    type: 'unknown',
  })
  const helper = createHelper({ nextBlock })
  nextBlock.helper = helper
  const block = new SpaceBlock(helper, { refer, rect, distance: 40, type })
  return { block, helper, nextBlock }
}

describe('SpaceBlock', () => {
  it('referRect / id / next 读取辅助信息', () => {
    const refer = { id: 'refer' } as any
    const nextBlock = new SpaceBlock(null as any, {
      refer,
      rect: NEXT_RECT,
      distance: 40,
      type: 'unknown',
    })
    const helper = createHelper({ nextBlock })
    nextBlock.helper = helper
    const block = new SpaceBlock(helper, { refer, rect: NEXT_RECT, distance: 40, type: 'top' })

    expect(block.referRect).toBe(REFER_RECT)
    expect(block.helper).toBe(helper)
    expect(block.next).toBe(nextBlock)
    expect(block.id).toBe('100-60-100-40')

    block._id = 'custom'
    expect(block.id).toBe('custom')
  })

  it('crossReferRect / crossDragNodesRect 按方向投影', () => {
    const helper = createHelper()
    const topBlock = new SpaceBlock(helper, {
      refer: {} as any,
      rect: new Rect(100, 60, 100, 40),
      distance: 40,
      type: 'top',
    })

    expect(topBlock.crossReferRect).toEqual(new Rect(100, 60, 100, 40))
    expect(topBlock.crossDragNodesRect).toEqual(new Rect(0, 60, 100, 40))

    const leftBlock = new SpaceBlock(helper, {
      refer: {} as any,
      rect: new Rect(70, 100, 30, 100),
      distance: 30,
      type: 'left',
    })

    expect(leftBlock.crossReferRect).toEqual(new Rect(70, 100, 30, 100))
    expect(leftBlock.crossDragNodesRect).toEqual(new Rect(70, 0, 30, 100))
  })

  it('needExtendsLine 根据交叉重叠判断', () => {
    const farHelper = createHelper({ dragRect: new Rect(100, 300, 100, 100) })
    const farBlock = new SpaceBlock(farHelper, {
      refer: {} as any,
      rect: new Rect(100, 60, 100, 40),
      distance: 40,
      type: 'top',
    })
    expect(farBlock.needExtendsLine).toBe(false)
    expect(farBlock.extendsLine).toBeUndefined()

    const nearHelper = createHelper({ dragRect: new Rect(250, 100, 50, 50) })
    const nearBlock = new SpaceBlock(nearHelper, {
      refer: {} as any,
      rect: new Rect(100, 60, 100, 40),
      distance: 40,
      type: 'top',
    })
    expect(nearBlock.needExtendsLine).toBe(true)
    expect(nearBlock.extendsLine).toEqual({
      start: { x: 200, y: 100 },
      end: { x: 200, y: 100 },
    })
  })

  it('isometrics 收集距离相同的间距块', () => {
    const refer = {} as any
    const blockC = new SpaceBlock(null as any, {
      refer,
      rect: NEXT_RECT,
      distance: 44,
      type: 'unknown',
    })
    const blockB = new SpaceBlock(null as any, {
      refer,
      rect: NEXT_RECT,
      distance: 40,
      type: 'left',
    })
    const helper = {
      getNodeRect: () => REFER_RECT,
      calcAroundSpaceBlocks: () => ({ top: blockB, left: blockC }),
      dragNodesRect: DRAG_RECT,
      dragNodesEdgeLines: calcEdgeLinesOfRect(DRAG_RECT),
    } as any
    blockB.helper = helper
    blockC.helper = helper

    const block = new SpaceBlock(helper, { refer, rect: NEXT_RECT, distance: 40, type: 'top' })
    expect(block.isometrics).toEqual([blockB])

    const isolated = new SpaceBlock(createHelper(), {
      refer,
      rect: NEXT_RECT,
      distance: 40,
      type: 'top',
    })
    expect(isolated.isometrics).toEqual([])
    expect(isolated.snapLine).toBeUndefined()
  })

  it('snapLine 为 top 间距块生成参考线', () => {
    const { block } = createSnapLineBlock('top', new Rect(100, 60, 100, 40))
    const snapLine = block.snapLine!

    expect(snapLine.start).toEqual({ x: 100, y: 240 })
    expect(snapLine.end).toEqual({ x: 200, y: 240 })
    expect(snapLine.type).toBe('space-block')
    expect(snapLine.distance).toBe(140)
  })

  it('snapLine 为 bottom 间距块生成参考线', () => {
    const { block } = createSnapLineBlock('bottom', new Rect(100, 200, 100, 40))
    const snapLine = block.snapLine!

    expect(snapLine.start).toEqual({ x: 100, y: 60 })
    expect(snapLine.end).toEqual({ x: 200, y: 60 })
    expect(snapLine.distance).toBe(10)
  })

  it('snapLine 为 left 间距块生成参考线', () => {
    const { block } = createSnapLineBlock('left', new Rect(70, 100, 30, 100))
    const snapLine = block.snapLine!

    expect(snapLine.start).toEqual({ x: 300, y: 60 })
    expect(snapLine.end).toEqual({ x: 300, y: 100 })
    expect(snapLine.distance).toBe(200)
  })

  it('snapLine 为 right 间距块生成参考线', () => {
    const { block } = createSnapLineBlock('right', new Rect(200, 100, 50, 100))
    const snapLine = block.snapLine!

    expect(snapLine.start).toEqual({ x: 0, y: 60 })
    expect(snapLine.end).toEqual({ x: 0, y: 100 })
    expect(snapLine.distance).toBe(0)
  })
})
