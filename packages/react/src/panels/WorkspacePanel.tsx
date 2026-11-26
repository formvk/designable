import type { CSSProperties, ReactNode } from 'react'

import { usePrefix } from '../hooks'
import { cx } from '../utils'

export interface IWorkspaceItemProps {
  style?: CSSProperties
  className?: string
  flexable?: boolean
  children?: ReactNode
}

const WorkspacePanelContainer = (props: IWorkspaceItemProps) => {
  const prefix = usePrefix('workspace-panel')
  return (
    <div className={cx(prefix, props.className)} style={props.style}>
      {props.children}
    </div>
  )
}

const WorkspacePanelItem = (props: IWorkspaceItemProps) => {
  const prefix = usePrefix('workspace-panel-item')
  return (
    <div
      className={cx(prefix, props.className)}
      style={{
        flexGrow: props.flexable ? 1 : 0,
        flexShrink: props.flexable ? 1 : 0,
        ...props.style,
      }}
    >
      {props.children}
    </div>
  )
}

WorkspacePanelItem.displayName = 'WorkspacePanel.Item'

export const WorkspacePanel = Object.assign(WorkspacePanelContainer, {
  Item: WorkspacePanelItem,
  displayName: 'WorkspacePanel',
})
