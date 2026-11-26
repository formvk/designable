import type { TreeNode } from '@formvk/designable-core'
import type { MouseEvent } from 'react'

import type { ICompositePanelItemProps } from '../panels/CompositePanel'

export const DESIGNER_SLOTS = {
  toolbarLeft: 'toolbar.left',
  toolbarRight: 'toolbar.right',
  compositeNavItem: 'composite.nav-item',
  compositeHeaderActions: 'composite.header-actions',
  settingsEmpty: 'settings.empty',
  resourceSearch: 'resource.search',
  auxSelector: 'aux.selector',
  auxActions: 'aux.actions',
  canvasEmpty: 'canvas.empty',
} as const

export type DesignerSlotName = (typeof DESIGNER_SLOTS)[keyof typeof DESIGNER_SLOTS]

export interface IRenderCompositeNavItemProps {
  item: ICompositePanelItemProps
  active: boolean
  direction: 'left' | 'right'
  showNavTitle?: boolean
  onActivate: (event: MouseEvent<HTMLElement>) => void
}

export interface IRenderCompositeHeaderActionsProps {
  pinning: boolean
  onTogglePinning: () => void
  onClose: () => void
}

export interface IRenderResourceSearchProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

export interface IRenderAuxSelectorProps {
  node: TreeNode
}

export interface IRenderAuxActionsProps {
  node: TreeNode
  canClone: boolean
  canDelete: boolean
}

export interface IRenderCanvasEmptyProps {
  dragTipsDirection?: 'left' | 'right'
}
