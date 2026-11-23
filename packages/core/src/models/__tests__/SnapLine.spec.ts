import { Rect } from '@formvk/designable-shared'
import { describe, expect, it } from 'vitest'

import { SnapLine } from '../SnapLine'
import { TransformHelper } from '../TransformHelper'

const createNode = (rect: Rect, parent?: any) => ({
  parent,
  getValidElementOffsetRect: () => rect,
})

const createLine = (line: any, helper: any = {}) =>
  new SnapLine(helper as any, {
    distance: 10,
    start: { x: 0, y: 0 },
    end: { x: 100, y: 0 },
    ...line,
  })

describe('SnapLine', () => {
  it('构造时补全默认类型与 id', () => {
    const refer: any = { id: 'node-1' }
    const line = createLine({
      start: { x: 10, y: 20 },
      end: { x: 30, y: 20 },
      refer,
    })

    expect(line.type).toBe('normal')
    expect(line.refer).toBe(refer)
    expect(line.id).toBe('10-20-30-20')

    const custom = createLine({ id: 'custom', type: 'ruler' })
    expect(custom.id).toBe('custom')
    expect(custom.type).toBe('ruler')
  })

  it('direction / closest / rect 由线段与距离推导', () => {
    const vertical = createLine({ start: { x: 10, y: 20 }, end: { x: 10, y: 60 } })
    expect(vertical.direction).toBe('v')
    expect(vertical.rect).toEqual(new Rect(10, 20, 0, 40))

    const horizontal = createLine({ distance: 3 })
    expect(horizontal.direction).toBe('h')
    expect(horizontal.closest).toBe(true)
    expect(horizontal.rect).toEqual(new Rect(0, 0, 100, 0))

    expect(createLine({ distance: TransformHelper.threshold }).closest).toBe(false)
  })

  it('snapEdge 识别水平线吸附到的边缘', () => {
    const line = createLine({ start: { x: 0, y: 100 }, end: { x: 100, y: 100 } })

    expect(line.snapEdge(new Rect(0, 100, 100, 100))).toBe('ht')
    expect(line.snapEdge(new Rect(0, 50, 100, 100))).toBe('hc')
    expect(line.snapEdge(new Rect(0, 2, 100, 100))).toBe('hb')
    expect(line.snapEdge(new Rect(0, 300, 100, 100))).toBeUndefined()
  })

  it('snapEdge 识别垂直线吸附到的边缘', () => {
    const line = createLine({ start: { x: 100, y: 0 }, end: { x: 100, y: 100 } })

    expect(line.snapEdge(new Rect(100, 0, 100, 100))).toBe('vl')
    expect(line.snapEdge(new Rect(50, 0, 100, 100))).toBe('vc')
    expect(line.snapEdge(new Rect(2, 0, 100, 100))).toBe('vr')
    expect(line.snapEdge(new Rect(300, 0, 100, 100))).toBeUndefined()
  })

  it('translate 水平线调整 y 偏移', () => {
    const parent = createNode(new Rect(0, 0, 200, 200))
    const node = createNode(new Rect(0, 0, 100, 100), parent)
    const line = createLine({ start: { x: 0, y: 150 }, end: { x: 100, y: 150 } })
    const translate = { x: 0, y: 0 }

    line.translate(node as any, translate)

    expect(translate.y).toBe(50)
    expect(translate.x).toBe(0)
  })

  it('translate 垂直线调整 x 偏移', () => {
    const parent = createNode(new Rect(0, 0, 200, 200))
    const node = createNode(new Rect(0, 0, 100, 100), parent)
    const line = createLine({ start: { x: 150, y: 0 }, end: { x: 150, y: 100 } })
    const translate = { x: 0, y: 0 }

    line.translate(node as any, translate)

    expect(translate.x).toBe(50)
    expect(translate.y).toBe(0)
  })

  it('translate 在无 parent 时直接返回', () => {
    const translate = { x: 1, y: 2 }

    createLine({}).translate(createNode(new Rect(0, 0, 10, 10)) as any, translate)
    createLine({}).translate(undefined as any, translate)

    expect(translate).toEqual({ x: 1, y: 2 })
  })

  it('resize 按水平吸附方向与拖拽方向修正矩形', () => {
    const parent = createNode(new Rect(0, 0, 200, 200))
    const node = createNode(new Rect(0, 0, 100, 100), parent)
    const line = createLine({ start: { x: 0, y: 150 }, end: { x: 100, y: 150 } })

    const topHelper = { direction: 'left-top', cursorDragNodesRect: new Rect(0, 0, 100, 120) }
    const topLine = createLine(line, topHelper)
    const topRect = new Rect(0, 149, 100, 100)
    topLine.resize(node as any, topRect)
    expect(topRect.y).toBe(50)
    expect(topRect.height).toBe(70)

    const bottomHelper = { direction: 'center-bottom', cursorDragNodesRect: new Rect(0, 0, 100, 120) }
    const bottomLine = createLine(line, bottomHelper)
    const bottomRect = new Rect(0, 51, 100, 98)
    bottomLine.resize(node as any, bottomRect)
    expect(bottomRect.y).toBe(51)
    expect(bottomRect.height).toBe(150)
  })

  it('resize 按垂直吸附方向与拖拽方向修正矩形', () => {
    const parent = createNode(new Rect(0, 0, 200, 200))
    const node = createNode(new Rect(0, 0, 100, 100), parent)
    const line = createLine({ start: { x: 150, y: 0 }, end: { x: 150, y: 100 } })

    const leftHelper = { direction: 'left-top', cursorDragNodesRect: new Rect(0, 0, 100, 120) }
    const leftLine = createLine(line, leftHelper)
    const leftRect = new Rect(149, 0, 100, 100)
    leftLine.resize(node as any, leftRect)
    expect(leftRect.x).toBe(50)
    expect(leftRect.width).toBe(50)

    const rightHelper = { direction: 'right-center', cursorDragNodesRect: new Rect(0, 0, 100, 120) }
    const rightLine = createLine(line, rightHelper)
    const rightRect = new Rect(51, 0, 98, 100)
    rightLine.resize(node as any, rightRect)
    expect(rightRect.x).toBe(51)
    expect(rightRect.width).toBe(150)
  })

  it('resize 在未吸附或方向不匹配时不修改矩形', () => {
    const parent = createNode(new Rect(0, 0, 200, 200))
    const node = createNode(new Rect(0, 0, 100, 100), parent)
    const horizontal = createLine({ start: { x: 0, y: 150 }, end: { x: 100, y: 150 } })
    const helper = { direction: 'left-top', cursorDragNodesRect: new Rect(0, 0, 100, 120) }
    const notSnapped = new Rect(0, 0, 100, 100)
    createLine(horizontal, helper).resize(node as any, notSnapped)
    expect(notSnapped).toEqual(new Rect(0, 0, 100, 100))

    const vertical = createLine({ start: { x: 150, y: 0 }, end: { x: 150, y: 100 } })
    const unsupported = { direction: 'center-left' }
    const unsupportedRect = new Rect(149, 0, 100, 100)
    createLine(vertical, unsupported).resize(node as any, unsupportedRect)
    expect(unsupportedRect).toEqual(new Rect(149, 0, 100, 100))

    const noParentRect = new Rect(149, 0, 100, 100)
    createLine(vertical, helper).resize(createNode(new Rect(0, 0, 100, 100)) as any, noParentRect)
    expect(noParentRect).toEqual(new Rect(149, 0, 100, 100))
  })
})
