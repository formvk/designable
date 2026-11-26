import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

import { useDesigner, usePrefix, useViewport } from '../../hooks'
import { Cover } from './Cover'
import { FreeSelection } from './FreeSelection'
import { HoverWidget } from './HoverWidget'
import { Insertion } from './Insertion'
import { Selection } from './Selection'
import { SnapLine } from './SnapLine'
import { SpaceBlock } from './SpaceBlock'

const baseStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  transform: 'perspective(1px) translate3d(0,0,0)',
  pointerEvents: 'none',
  zIndex: 2,
}

/**
 * 画布辅助层：插入线、吸附线、间距块、悬浮框、选中框、拖拽遮罩与框选。
 * 所有元素均不参与布局，交互穿透。
 */
export const AuxToolWidget = () => {
  const engine = useDesigner()
  const viewport = useViewport()
  const prefix = usePrefix('aux-tool')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!viewport) return
    return engine.subscribeWith('viewport:scroll', () => {
      if (viewport.isIframe && ref.current) {
        ref.current.style.transform = `perspective(1px) translate3d(${-viewport.scrollX}px,${-viewport.scrollY}px,0)`
      }
    })
  }, [engine, viewport])

  if (!viewport) return null

  return (
    <div ref={ref} className={prefix} style={baseStyle}>
      <Insertion />
      <SpaceBlock />
      <SnapLine />
      <HoverWidget />
      <Selection />
      <Cover />
      <FreeSelection />
    </div>
  )
}

AuxToolWidget.displayName = 'AuxToolWidget'
