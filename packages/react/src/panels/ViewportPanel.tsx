import { Simulator } from '../containers/Simulator'
import { WorkspacePanel } from './WorkspacePanel'
import type { IWorkspaceItemProps } from './WorkspacePanel'

/**
 * 画布面板：自适应填充剩余空间，并套用当前模拟器。
 */
export const ViewportPanel = (props: IWorkspaceItemProps) => {
  return (
    <WorkspacePanel.Item {...props} flexable>
      <Simulator>{props.children}</Simulator>
    </WorkspacePanel.Item>
  )
}

ViewportPanel.displayName = 'ViewportPanel'
