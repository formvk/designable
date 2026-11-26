import type { Engine, Registry } from '@formvk/designable-core'
import { useContext } from 'react'

import { DesignerEngineContext } from '../context'

/**
 * 获取设计器引擎。必须在 Designer 内部使用。
 */
export const useDesigner = (): Engine => {
  const engine = useContext(DesignerEngineContext)
  if (!engine) {
    throw new Error('useDesigner must be used inside <Designer /> (DesignerEngineContext is missing)')
  }
  return engine
}

export const useWorkbench = () => useDesigner().workbench

export const useCursor = () => useDesigner().cursor

export const useScreen = () => useDesigner().screen

export const useRegistry = (): Registry => useDesigner().registry
