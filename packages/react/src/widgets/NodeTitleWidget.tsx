import type { TreeNode } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'

export interface INodeTitleWidgetProps {
  node: TreeNode
}

export const NodeTitleWidget = observer((props: INodeTitleWidgetProps) => {
  const node = props.node?.componentName === '$$ResourceNode$$' ? props.node.children[0] : props.node
  if (!node) return null
  return <>{node.getMessage('title') || node.componentName}</>
})

NodeTitleWidget.displayName = 'NodeTitleWidget'
