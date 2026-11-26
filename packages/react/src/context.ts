import type { Engine, TreeNode, Workspace } from '@formvk/designable-core'
import { createContext } from 'react'

import type { IDesignerComponents, IDesignerContextValue } from './types'

export const DesignerContext = createContext<IDesignerContextValue | null>(null)

export const DesignerEngineContext = createContext<Engine | null>(null)

export const WorkspaceContext = createContext<Workspace | null>(null)

export const TreeNodeContext = createContext<TreeNode | null>(null)

export const DesignerComponentsContext = createContext<IDesignerComponents>({})
