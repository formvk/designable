import { observer } from '@formvk/reactive-react'
import type { ReactNode } from 'react'

import { useWorkbench } from './hooks'
import { Workspace } from './Workspace'

export interface IWorkbenchProps {
  children?: ReactNode
}

/**
 * 渲染当前工作区。
 */
export const Workbench = observer((props: IWorkbenchProps) => {
  const workbench = useWorkbench()
  const workspaceId = workbench.currentWorkspace?.id
  return <Workspace id={workspaceId}>{props.children}</Workspace>
})

Workbench.displayName = 'Workbench'
