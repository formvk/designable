import type {
  History,
  Operation as IOperationModel,
  Selection,
  TreeNode,
  Viewport,
  Workspace,
} from '@formvk/designable-core'
import { useObserver } from '@formvk/reactive-react'
import { useContext } from 'react'

import { WorkspaceContext } from '../context'
import { useDesigner } from './useDesigner'

export type HoverModel = IOperationModel['hover']

export type MoveHelperModel = IOperationModel['moveHelper']

export type TransformHelperModel = IOperationModel['transformHelper']

/**
 * 获取当前工作区，优先级：显式 id -> WorkspaceContext -> 当前工作区。
 */
export const useWorkspace = (workspaceId?: string): Workspace | undefined => {
  const designer = useDesigner()
  const contextWorkspace = useContext(WorkspaceContext)

  return useObserver(() => {
    const id = workspaceId || contextWorkspace?.id
    if (id) return designer.workbench.findWorkspaceById(id)
    return designer.workbench.currentWorkspace
  })
}

export const useOperation = (workspaceId?: string): IOperationModel | undefined => useWorkspace(workspaceId)?.operation

export const useTree = (workspaceId?: string): TreeNode | undefined => useOperation(workspaceId)?.tree

export const useViewport = (workspaceId?: string): Viewport | undefined => useWorkspace(workspaceId)?.viewport

export const useOutline = (workspaceId?: string): Viewport | undefined => useWorkspace(workspaceId)?.outline

export const useSelection = (workspaceId?: string): Selection | undefined => useOperation(workspaceId)?.selection

export const useHover = (workspaceId?: string): HoverModel | undefined => useOperation(workspaceId)?.hover

export const useMoveHelper = (workspaceId?: string): MoveHelperModel | undefined =>
  useOperation(workspaceId)?.moveHelper

export const useTransformHelper = (workspaceId?: string): TransformHelperModel | undefined =>
  useOperation(workspaceId)?.transformHelper

export const useHistory = (workspaceId?: string): History<Workspace> | undefined => useWorkspace(workspaceId)?.history

export const useSelected = (workspaceId?: string): string[] => {
  const selection = useSelection(workspaceId)
  return useObserver(() => selection?.selected || [])
}

export const useSelectedNode = (workspaceId?: string): TreeNode | undefined => {
  const selected = useSelected(workspaceId)
  const tree = useTree(workspaceId)
  return tree?.findById?.(selected[0])
}
