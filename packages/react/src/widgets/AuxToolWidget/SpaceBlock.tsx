import { CursorStatus } from '@formvk/designable-core'
import type { ILineSegment } from '@formvk/designable-shared'
import { calcRectOfAxisLineSegment } from '@formvk/designable-shared'
import { observer } from '@formvk/reactive-react'
import { Fragment } from 'react'

import { useCursor, usePrefix, useTransformHelper } from '../../hooks'

/**
 * 间距测量：拖拽节点与其他节点之间的间距标尺与自动吸附阈值高亮。
 */
export const SpaceBlock = observer(() => {
  const cursor = useCursor()
  const transformHelper = useTransformHelper()
  const prefix = usePrefix('aux-space-block')

  if (cursor.status !== CursorStatus.Dragging || !transformHelper) return null

  const renderRulerBox = (distance: number, type?: string) => {
    if (type === 'top' || type === 'bottom') {
      return (
        <div className={`${prefix}-ruler-v`}>
          <div className={`${prefix}-ruler-indicator`}>
            <span>{distance?.toFixed(0)}</span>
          </div>
        </div>
      )
    }
    if (type === 'left' || type === 'right') {
      return (
        <div className={`${prefix}-ruler-h`}>
          <div className={`${prefix}-ruler-indicator`}>
            <span>{distance?.toFixed(0)}</span>
          </div>
        </div>
      )
    }
    return null
  }

  const renderDashedLine = (line?: ILineSegment) => {
    if (!line) return null
    const rect = calcRectOfAxisLineSegment(line)
    if (!rect) return null
    const width = rect.width || 2
    const height = rect.height || 2
    return (
      <svg
        width={`${width}px`}
        height={`${height}px`}
        viewBox={`0 0 ${width} ${height}`}
        style={{
          top: 0,
          left: 0,
          transform: `perspective(1px) translate3d(${line.start.x}px,${line.start.y}px,0)`,
          position: 'absolute',
          zIndex: 3,
        }}
      >
        <line
          x1={line.start.x - rect.x}
          y1={line.start.y - rect.y}
          x2={line.end.x - rect.x}
          y2={line.end.y - rect.y}
          strokeDasharray="4"
          className={`${prefix}-line`}
          strokeWidth={2}
        />
      </svg>
    )
  }

  return (
    <>
      {transformHelper.measurerSpaceBlocks.map(({ type, crossDragNodesRect, distance, extendsLine }, key) => (
        <Fragment key={key}>
          {renderDashedLine(extendsLine)}
          <div
            style={{
              top: 0,
              left: 0,
              height: crossDragNodesRect.height,
              width: crossDragNodesRect.width,
              transform: `perspective(1px) translate3d(${crossDragNodesRect.x}px,${crossDragNodesRect.y}px,0)`,
              position: 'absolute',
              zIndex: 3,
            }}
          >
            {renderRulerBox(distance, type)}
          </div>
        </Fragment>
      ))}
      {transformHelper.thresholdSpaceBlocks.map(({ rect }, key) => (
        <div
          key={key}
          className={`${prefix}-threshold`}
          style={{
            top: 0,
            left: 0,
            height: rect.height,
            width: rect.width,
            transform: `perspective(1px) translate3d(${rect.x}px,${rect.y}px,0)`,
            position: 'absolute',
            zIndex: 1,
          }}
        />
      ))}
    </>
  )
})

SpaceBlock.displayName = 'SpaceBlock'
