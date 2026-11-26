import { globalThisPolyfill } from '@formvk/shared'
import { useMemo, useRef } from 'react'
import type { ReactNode } from 'react'

import { WorkspaceContext } from './context'
import { useDesigner } from './hooks'

export interface IWorkspaceProps {
  id?: string
  title?: string
  description?: string
  children?: ReactNode
}

/**
 * 工作区容器，负责创建/切换核心 Workspace 模型。
 */
export const Workspace = (props: IWorkspaceProps) => {
  const { id, title, description, children } = props
  const designer = useDesigner()
  const oldIdRef = useRef<string | undefined>(undefined)

  const workspace = useMemo(() => {
    if (oldIdRef.current && oldIdRef.current !== id) {
      designer.workbench.findWorkspaceById(oldIdRef.current)?.viewport.detachEvents()
    }
    const nextId = id || 'index'
    const instance = designer.workbench.ensureWorkspace({
      id: nextId,
      title: title || '',
      description: description || '',
      // 真实元素在 Viewport 挂载时注入
      contentWindow: globalThisPolyfill,
      viewportElement: undefined as unknown as HTMLElement,
    })
    if (instance) instance.title = title || instance.title
    if (instance) instance.description = description || instance.description
    oldIdRef.current = nextId
    return instance
  }, [id, designer])

  if (!workspace) return null

  return <WorkspaceContext.Provider value={workspace}>{children}</WorkspaceContext.Provider>
}

Workspace.displayName = 'Workspace'
