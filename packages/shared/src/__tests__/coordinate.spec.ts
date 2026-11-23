import { describe, expect, it } from 'vitest'

import {
  calcBoundingRect,
  calcClosestEdges,
  calcCombineSnapLineSegment,
  calcDistanceOfPointToRect,
  calcDistanceOfSnapLineToEdges,
  calcDistancePointToEdge,
  calcEdgeLinesOfRect,
  calcExtendsLineSegmentOfRect,
  calcOffsetOfSnapLineSegmentToEdge,
  calcQuadrantOfPointToRect,
  calcRectByStartEndPoint,
  calcRectOfAxisLineSegment,
  calcRelativeOfPointToRect,
  calcSpaceBlockOfRect,
  getRectPoints,
  isCrossRectInRect,
  isEqualRect,
  isLineSegment,
  isNearAfter,
  isPoint,
  isPointInRect,
  isRect,
  isRectInRect,
  LineSegment,
  Point,
  Rect,
  RectQuadrant,
} from '../coordinate'

describe('coordinate', () => {
  it('Rect 提供边界计算', () => {
    const rect = new Rect(10, 20, 30, 40)

    expect(rect.left).toBe(10)
    expect(rect.right).toBe(40)
    expect(rect.top).toBe(20)
    expect(rect.bottom).toBe(60)
  })

  it('isPointInRect 支持基础判定与关闭边缘灵敏度', () => {
    const rect = new Rect(0, 0, 100, 100)

    expect(isPointInRect(new Point(50, 50), rect)).toBe(true)
    expect(isPointInRect(new Point(5, 50), rect)).toBe(false)
    expect(isPointInRect(new Point(5, 50), rect, false)).toBe(true)
    expect(isPointInRect(new Point(101, 50), rect, false)).toBe(false)
  })

  it('isRectInRect 判断矩形包含关系', () => {
    const source = new Rect(0, 0, 100, 100)

    expect(isRectInRect(new Rect(10, 10, 20, 20), source)).toBe(true)
    expect(isRectInRect(new Rect(90, 90, 20, 20), source)).toBe(false)
  })

  it('calcBoundingRect 计算外接矩形', () => {
    const rect = calcBoundingRect([new Rect(10, 20, 30, 40), new Rect(0, 0, 10, 10)])

    expect(rect?.x).toBe(0)
    expect(rect?.y).toBe(0)
    expect(rect?.width).toBe(40)
    expect(rect?.height).toBe(60)
  })

  it('calcBoundingRect 对空数组返回 undefined', () => {
    expect(calcBoundingRect([])).toBeUndefined()
  })

  it('calcRectByStartEndPoint 处理不同拖拽方向', () => {
    const rect = calcRectByStartEndPoint(new Point(100, 100), new Point(50, 60))

    expect(rect.x).toBe(50)
    expect(rect.y).toBe(60)
    expect(rect.width).toBe(50)
    expect(rect.height).toBe(40)
  })

  it('calcDistanceOfPointToRect 计算点到矩形边缘距离', () => {
    const rect = new Rect(0, 0, 100, 100)

    expect(calcDistanceOfPointToRect(new Point(50, 50), rect)).toBe(0)
    expect(calcDistanceOfPointToRect(new Point(120, 50), rect)).toBe(20)
    expect(calcDistanceOfPointToRect(new Point(130, 140), rect)).toBe(50)
  })

  it('calcDistancePointToEdge 返回最近边距离', () => {
    const rect = new Rect(0, 0, 100, 100)

    expect(calcDistancePointToEdge(new Point(50, 10), rect)).toBe(10)
  })

  it('calcQuadrantOfPointToRect 判断点所在象限', () => {
    const rect = new Rect(0, 0, 100, 100)

    expect(calcQuadrantOfPointToRect(new Point(20, 20), rect)).toBe(RectQuadrant.Inner1)
    expect(calcQuadrantOfPointToRect(new Point(80, 80), rect)).toBe(RectQuadrant.Inner3)
    expect(calcQuadrantOfPointToRect(new Point(150, 20), rect)).toBe(RectQuadrant.Outer2)
  })

  it('类型守卫识别 Rect / Point / LineSegment', () => {
    expect(isRect(new Rect(1, 2, 10, 10))).toBeTruthy()
    expect(isRect({ x: 1, y: 2, width: 10 })).toBeFalsy()

    expect(isPoint(new Point(0, 0))).toBe(true)
    expect(isPoint({ x: 0 })).toBe(false)

    expect(isLineSegment(new LineSegment(new Point(0, 0), new Point(10, 10)))).toBe(true)
    expect(isLineSegment({ start: { x: 0, y: 0 } })).toBe(false)
  })

  it('isEqualRect 比较矩形是否相同', () => {
    expect(isEqualRect(new Rect(0, 0, 10, 10), new Rect(0, 0, 10, 10))).toBe(true)
    expect(isEqualRect({ x: 0, y: 0, width: 10, height: 10 }, { x: 1, y: 0, width: 10, height: 10 })).toBe(false)
    expect(isEqualRect(undefined, { x: 0, y: 0, width: 10, height: 10 })).toBeUndefined()
  })

  it('getRectPoints 返回四个顶点', () => {
    expect(getRectPoints(new Rect(10, 20, 30, 40))).toEqual([
      new Point(10, 20),
      new Point(40, 20),
      new Point(40, 60),
      new Point(10, 60),
    ])
  })

  it('isCrossRectInRect 判断中心点交叉', () => {
    const source = new Rect(0, 0, 100, 100)

    expect(isCrossRectInRect(new Rect(90, 90, 20, 20), source)).toBe(true)
    expect(isCrossRectInRect(new Rect(200, 200, 10, 10), source)).toBe(false)
  })

  it('isNearAfter 判断点靠近矩形哪一侧', () => {
    const rect = new Rect(0, 0, 100, 100)

    expect(isNearAfter(new Point(50, 90), rect)).toBe(true)
    expect(isNearAfter(new Point(50, 10), rect)).toBe(false)
    expect(isNearAfter(new Point(90, 50), rect, true)).toBe(true)
    expect(isNearAfter(new Point(10, 50), rect, true)).toBe(false)
  })

  it('calcRelativeOfPointToRect 返回相对位置信息', () => {
    expect(calcRelativeOfPointToRect(new Point(10, 10), new Rect(0, 0, 100, 100))).toEqual({
      quadrant: RectQuadrant.Inner1,
      distance: 0,
    })
  })

  it('calcEdgeLinesOfRect 计算边缘线', () => {
    expect(calcEdgeLinesOfRect()).toBeUndefined()

    const edges = calcEdgeLinesOfRect(new Rect(0, 0, 100, 100))!
    expect(edges.v).toHaveLength(3)
    expect(edges.h).toHaveLength(3)
    expect(edges.v[2]).toEqual(new LineSegment(new Point(100, 0), new Point(100, 100)))
    expect(edges.h[1]).toEqual(new LineSegment(new Point(0, 50), new Point(100, 50)))
  })

  it('calcRectOfAxisLineSegment 区分横纵线', () => {
    expect(calcRectOfAxisLineSegment()).toBeUndefined()
    expect(calcRectOfAxisLineSegment(new LineSegment(new Point(10, 10), new Point(10, 50)))).toEqual(
      new Rect(10, 10, 0, 40)
    )
    expect(calcRectOfAxisLineSegment(new LineSegment(new Point(10, 10), new Point(50, 10)))).toEqual(
      new Rect(10, 10, 40, 0)
    )
  })

  it('calcRectByStartEndPoint 处理四个方向与滚动偏移', () => {
    const rightBottom = calcRectByStartEndPoint(new Point(100, 100), new Point(150, 150))
    expect(rightBottom).toEqual(new Rect(100, 100, 50, 50))

    const leftTop = calcRectByStartEndPoint(new Point(100, 100), new Point(50, 50))
    expect(leftTop).toEqual(new Rect(50, 50, 50, 50))

    const leftBottom = calcRectByStartEndPoint(new Point(100, 100), new Point(50, 150))
    expect(leftBottom).toEqual(new Rect(50, 100, 50, 50))

    const rightTop = calcRectByStartEndPoint(new Point(100, 100), new Point(150, 50))
    expect(rightTop).toEqual(new Rect(100, 50, 50, 50))

    const scrolled = calcRectByStartEndPoint(new Point(10, 10), new Point(20, 20), 5, 5)
    expect(scrolled).toEqual(new Rect(5, 5, 15, 15))
  })

  it('calcSpaceBlockOfRect 计算上下左右间距', () => {
    const target = new Rect(100, 100, 100, 100)

    expect(calcSpaceBlockOfRect(target, new Rect(120, 40, 50, 20))).toEqual({
      type: 'top',
      distance: 40,
      rect: new Rect(100, 60, 100, 40),
    })
    expect(calcSpaceBlockOfRect(target, new Rect(120, 240, 50, 20))).toEqual({
      type: 'bottom',
      distance: 40,
      rect: new Rect(100, 200, 100, 40),
    })
    expect(calcSpaceBlockOfRect(target, new Rect(20, 120, 50, 50))).toEqual({
      type: 'left',
      distance: 30,
      rect: new Rect(70, 100, 30, 100),
    })
    expect(calcSpaceBlockOfRect(target, new Rect(250, 120, 50, 50))).toEqual({
      type: 'right',
      distance: 50,
      rect: new Rect(200, 100, 50, 100),
    })

    expect(calcSpaceBlockOfRect(target, new Rect(120, 40, 50, 20), 'left')).toBeUndefined()
    expect(calcSpaceBlockOfRect(target, new Rect(250, 40, 20, 20))).toBeUndefined()
  })

  it('calcExtendsLineSegmentOfRect 计算延伸参考线', () => {
    const target = new Rect(100, 100, 100, 100)

    expect(calcExtendsLineSegmentOfRect(target, new Rect(0, 0, 50, 50))).toEqual({
      start: { x: 50, y: 50 },
      end: { x: 50, y: 200 },
    })
    expect(calcExtendsLineSegmentOfRect(target, new Rect(150, 0, 100, 50))).toEqual({
      start: { x: 100, y: 50 },
      end: { x: 150, y: 50 },
    })
    expect(calcExtendsLineSegmentOfRect(target, new Rect(120, 120, 20, 20))).toBeUndefined()
  })

  it('calcOffsetOfSnapLineSegmentToEdge 吸附到最近边缘', () => {
    const current = new Rect(0, 0, 100, 100)

    expect(calcOffsetOfSnapLineSegmentToEdge(new LineSegment(new Point(105, 0), new Point(105, 100)), current)).toEqual(
      { x: 100, y: 0 }
    )
    expect(calcOffsetOfSnapLineSegmentToEdge(new LineSegment(new Point(0, 48), new Point(100, 48)), current)).toEqual({
      x: 0,
      y: 50,
    })
  })

  it('calcDistanceOfSnapLineToEdges 计算参考线距离', () => {
    const edges = calcEdgeLinesOfRect(new Rect(0, 0, 100, 100))!

    expect(calcDistanceOfSnapLineToEdges(new LineSegment(new Point(0, 48), new Point(100, 48)), edges)).toBe(2)
    expect(calcDistanceOfSnapLineToEdges(new LineSegment(new Point(90, 0), new Point(90, 100)), edges)).toBe(10)
    expect(calcDistanceOfSnapLineToEdges(new LineSegment(new Point(0, 0), new Point(10, 10)))).toBe(Infinity)
    expect(() => calcDistanceOfSnapLineToEdges(new LineSegment(new Point(0, 0), new Point(10, 10)), edges)).toThrow()
  })

  it('calcCombineSnapLineSegment 合并共线线段', () => {
    expect(
      calcCombineSnapLineSegment(
        new LineSegment(new Point(10, 20), new Point(10, 30)),
        new LineSegment(new Point(10, 10), new Point(10, 40))
      )
    ).toEqual(new LineSegment(new Point(10, 10), new Point(10, 40)))

    expect(
      calcCombineSnapLineSegment(
        new LineSegment(new Point(10, 10), new Point(30, 10)),
        new LineSegment(new Point(5, 10), new Point(20, 10))
      )
    ).toEqual(new LineSegment(new Point(5, 10), new Point(30, 10)))
  })

  it('calcClosestEdges 返回最近边缘', () => {
    const edges = calcEdgeLinesOfRect(new Rect(0, 0, 100, 100))!
    const [distance, line] = calcClosestEdges(new LineSegment(new Point(0, 45), new Point(100, 45)), edges)

    expect(distance).toBe(5)
    expect(line.start.y).toBe(50)

    expect(() => calcClosestEdges(new LineSegment(new Point(0, 0), new Point(10, 10)), edges)).toThrow()
  })
})
