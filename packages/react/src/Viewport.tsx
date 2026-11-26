import type { Viewport as ViewportModel } from '@formvk/designable-core'
import { requestIdle } from '@formvk/designable-shared'
import { globalThisPolyfill } from '@formvk/shared'
import { useLayoutEffect, useRef, useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'

import { usePrefix, useViewport } from './hooks'
import { cx } from './utils'
import { AuxToolWidget } from './widgets/AuxToolWidget'
import { EmptyWidget } from './widgets/EmptyWidget'

export interface IViewportProps extends Omit<HTMLAttributes<HTMLDivElement>, 'placeholder'> {
  placeholder?: ReactNode
  dragTipsDirection?: 'left' | 'right'
}

/**
 * 画布视口。支持普通 DOM 与 iframe 两种内容窗口。
 */
export const Viewport = (props: IViewportProps) => {
  const { placeholder, dragTipsDirection, className, style, children, ...rest } = props
  const prefix = usePrefix('viewport')
  const viewport = useViewport()
  const ref = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<ViewportModel | undefined>(undefined)
  const isFrameRef = useRef(false)
  const [loaded, setLoaded] = useState(false)

  useLayoutEffect(() => {
    if (!viewport) return
    const frameElement = ref.current?.querySelector('iframe')
    if (viewportRef.current && viewportRef.current !== viewport) {
      viewportRef.current.onUnmount()
    }
    if (frameElement) {
      frameElement.addEventListener('load', () => {
        viewport.onMount(frameElement, frameElement.contentWindow as Window)
        requestIdle(() => {
          isFrameRef.current = true
          setLoaded(true)
        })
      })
    } else if (ref.current) {
      viewport.onMount(ref.current, globalThisPolyfill)
      requestIdle(() => {
        isFrameRef.current = false
        setLoaded(true)
      })
    }
    viewportRef.current = viewport
    return () => {
      viewport.onUnmount()
    }
  }, [viewport])

  return (
    <div
      {...rest}
      ref={ref}
      className={cx(prefix, className)}
      style={{
        opacity: loaded ? 1 : 0,
        overflow: isFrameRef.current ? 'hidden' : 'auto',
        ...style,
      }}
    >
      {children}
      <AuxToolWidget />
      <EmptyWidget dragTipsDirection={dragTipsDirection}>{placeholder}</EmptyWidget>
    </div>
  )
}

Viewport.displayName = 'Viewport'
