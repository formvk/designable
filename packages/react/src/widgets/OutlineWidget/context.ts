import type { TreeNode } from '@formvk/designable-core'
import { createContext } from 'react'
import type { ReactNode } from 'react'

export interface IOutlineNodeContext {
  renderTitle?: (node: TreeNode) => ReactNode
  renderActions?: (node: TreeNode) => ReactNode
}

export const OutlineNodeContext = createContext<IOutlineNodeContext>({})
