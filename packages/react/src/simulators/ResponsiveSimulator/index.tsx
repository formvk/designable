import { CursorDragType, DragMoveEvent, DragStartEvent, DragStopEvent } from '@formvk/designable-core'
import { Icon } from '@formvk/designable-react-icons'
import { observer } from '@formvk/reactive-react'
import { useEffect, useRef } from 'react'
import type { CSSProperties, PropsWithChildren, ReactNode } from 'react'

import { useDesigner, usePrefix, useScreen } from '../../hooks'
import { cx } from '../../utils'

export enum ResizeHandleType {
  Resize = 'RESIZE',
  ResizeWidth = 'RESIZE_WIDTH',
  ResizeHeight = 'RESIZE_HEIGHT',
}

export interface IResizeHandleProps {
  type: ResizeHandleType
  children?: ReactNode
}

const ResizeHandle = (props: IResizeHandleProps) => {
  const prefix = usePrefix('resize-handle')
  const designer = useDesigner()
  return (
    <div
      className={cx(prefix, `${prefix}-${props.type}`)}
      {...{ [designer.props.screenResizeHandlerAttrName]: props.type }}
    >
      {props.children}
    </div>
  )
}

ResizeHandle.displayName = 'ResizeHandle'

export interface IResponsiveSimulatorProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

const useResizeEffect = (content: React.RefObject<HTMLDivElement | null>) => {
  const engine = useDesigner()
  const screen = engine.screen

  useEffect(() => {
    let status: ResizeHandleType | null = null
    let startX = 0
    let startY = 0
    let startWidth = 0
    let startHeight = 0

    const cursorOf = (value: ResizeHandleType) => {
      if (value === ResizeHandleType.Resize) return 'nwse-resize'
      if (value === ResizeHandleType.ResizeWidth) return 'ew-resize'
      return 'ns-resize'
    }

    const offStart = engine.subscribeTo(DragStartEvent, event => {
      const target = event.data.target as HTMLElement
      const handler = target?.closest(`*[${engine.props.screenResizeHandlerAttrName}]`)
      const rect = content.current?.getBoundingClientRect()
      if (!handler || !rect) return
      status = handler.getAttribute(engine.props.screenResizeHandlerAttrName) as ResizeHandleType
      startX = event.data.topClientX as number
      startY = event.data.topClientY as number
      startWidth = rect.width
      startHeight = rect.height
      engine.cursor.setStyle(cursorOf(status))
      engine.cursor.setDragType(CursorDragType.Resize)
    })

    const offMove = engine.subscribeTo(DragMoveEvent, event => {
      if (!status) return
      const deltaX = (event.data.topClientX as number) - startX
      const deltaY = (event.data.topClientY as number) - startY
      if (status === ResizeHandleType.Resize) {
        screen.setSize(startWidth + deltaX, startHeight + deltaY)
      } else if (status === ResizeHandleType.ResizeWidth) {
        screen.setSize(startWidth + deltaX, startHeight)
      } else if (status === ResizeHandleType.ResizeHeight) {
        screen.setSize(startWidth, startHeight + deltaY)
      }
    })

    const offStop = engine.subscribeTo(DragStopEvent, () => {
      if (!status) return
      status = null
      engine.cursor.setStyle('')
      engine.cursor.setDragType(CursorDragType.Move)
    })

    return () => {
      offStart()
      offMove()
      offStop()
    }
  }, [engine, screen, content])
}

/**
 * 自适应模拟器：拖拽右下角与边缘调整画布尺寸。
 */
export const ResponsiveSimulator = observer((props: PropsWithChildren<IResponsiveSimulatorProps>) => {
  const content = useRef<HTMLDivElement>(null)
  const prefix = usePrefix('responsive-simulator')
  const screen = useScreen()
  const size = { width: screen.width, height: screen.height }

  useResizeEffect(content)

  return (
    <div {...props} className={cx(prefix, props.className)}>
      <div className={`${prefix}-container`}>
        <div
          ref={content}
          className={`${prefix}-content`}
          style={{
            width: size.width,
            height: size.height,
          }}
        >
          {props.children}
          <ResizeHandle type={ResizeHandleType.Resize}>
            <Icon name="resize" size={10} />
          </ResizeHandle>
          <ResizeHandle type={ResizeHandleType.ResizeHeight}>
            <Icon name="minus" size={10} />
          </ResizeHandle>
          <ResizeHandle type={ResizeHandleType.ResizeWidth}>
            <Icon name="minus" size={10} />
          </ResizeHandle>
        </div>
      </div>
    </div>
  )
})

ResponsiveSimulator.displayName = 'ResponsiveSimulator'
