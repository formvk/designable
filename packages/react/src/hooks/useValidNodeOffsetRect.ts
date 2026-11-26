import type { TreeNode } from '@formvk/designable-core'
import { CursorDragType, CursorStatus } from '@formvk/designable-core'
import type { IRect } from '@formvk/designable-shared'
import { LayoutObserver } from '@formvk/designable-shared'
import { useObserver } from '@formvk/reactive-react'
import { useEffect, useReducer, useRef } from 'react'

import { useDesigner } from './useDesigner'
import { useViewport } from './useWorkspace'

/**
 * 获取节点相对视口的矩形，节点尺寸/滚动/缩放变化时自动更新。
 */
export const useValidNodeOffsetRect = (node?: TreeNode) => {
  const engine = useDesigner()
  const viewport = useViewport()
  const [, forceUpdate] = useReducer((count: number) => count + 1, 0)
  const rectRef = useRef<IRect | undefined>(undefined)

  const element = node ? viewport?.findElementById(node.id) : undefined

  // 订阅视口尺寸与滚动变化
  useObserver(() => {
    if (!viewport) return ''
    return [viewport.width, viewport.height, viewport.scrollX, viewport.scrollY, viewport.scale].join(',')
  })

  const rect = (() => {
    if (!viewport) return undefined
    // 拖拽移动期间节点位置由 3D 变换驱动，避免重复测量
    if (engine.cursor.status !== CursorStatus.Normal && engine.cursor.dragType === CursorDragType.Move) {
      return rectRef.current
    }
    return viewport.getValidNodeOffsetRect(node)
  })()
  rectRef.current = rect

  useEffect(() => {
    if (!element) return
    const observer = new LayoutObserver(() => forceUpdate())
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [element, node, viewport])

  return rect
}
