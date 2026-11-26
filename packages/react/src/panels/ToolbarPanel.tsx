import { usePrefix } from '../hooks'
import { DesignerSlot, DESIGNER_SLOTS } from '../plugins'
import { cx } from '../utils'
import { WorkspacePanel } from './WorkspacePanel'
import type { IWorkspaceItemProps } from './WorkspacePanel'

/**
 * 工具栏面板：顶部一行，两端对齐。
 *
 * 未传入 children 时渲染 `toolbar.left` 与 `toolbar.right` 两个命名槽位。
 */
export const ToolbarPanel = (props: IWorkspaceItemProps) => {
  const prefix = usePrefix('toolbar-panel')
  return (
    <WorkspacePanel.Item {...props} className={cx(prefix, props.className)}>
      {props.children ?? (
        <>
          <DesignerSlot name={DESIGNER_SLOTS.toolbarLeft} />
          <DesignerSlot name={DESIGNER_SLOTS.toolbarRight} />
        </>
      )}
    </WorkspacePanel.Item>
  )
}

ToolbarPanel.displayName = 'ToolbarPanel'
