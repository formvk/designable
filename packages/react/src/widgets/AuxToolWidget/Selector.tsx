import type { TreeNode } from '@formvk/designable-core'
import { Icon } from '@formvk/designable-react-icons'

import { useHover, usePrefix } from '../../hooks'
import { DesignerSlot, DESIGNER_SLOTS } from '../../plugins'
import { IconWidget } from '../IconWidget'
import { NodeTitleWidget } from '../NodeTitleWidget'

export interface ISelectorProps {
  node: TreeNode
}

/**
 * 节点层级选择器：默认展示当前节点标题，可由 `aux.selector` 槽位接管为可展开的祖先链。
 */
export const Selector = (props: ISelectorProps) => {
  const { node } = props
  const prefix = usePrefix('aux-selector')
  const hover = useHover()

  const renderIcon = (target: TreeNode) => {
    if (target.designerProps?.icon) return <IconWidget infer={target.designerProps.icon} />
    if (target === target.root) return <Icon name="outline" />
    if (target.designerProps?.droppable) return <Icon name="node" />
    return <Icon name="node" />
  }

  return (
    <div className={prefix} onMouseEnter={() => hover?.setHover(node)}>
      <DesignerSlot
        name={DESIGNER_SLOTS.auxSelector}
        props={{ node }}
        fallback={
          <button type="button" className={`${prefix}-title`}>
            {renderIcon(node)}
            <span className={`${prefix}-label`}>
              <NodeTitleWidget node={node} />
            </span>
          </button>
        }
      />
    </div>
  )
}

Selector.displayName = 'Selector'
