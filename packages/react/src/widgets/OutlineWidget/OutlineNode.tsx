import type { TreeNode } from '@formvk/designable-core'
import { ClosestPosition, CursorStatus } from '@formvk/designable-core'
import { Icon } from '@formvk/designable-react-icons'
import { observer } from '@formvk/reactive-react'
import { useContext, useState } from 'react'
import type { CSSProperties } from 'react'

import { useCursor, useMoveHelper, usePrefix, useSelection } from '../../hooks'
import { cx } from '../../utils'
import { IconWidget } from '../IconWidget'
import { NodeTitleWidget } from '../NodeTitleWidget'
import { OutlineNodeContext } from './context'

export interface IOutlineTreeNodeProps {
  node: TreeNode
  workspaceId?: string
  className?: string
  style?: CSSProperties
}

/**
 * 大纲树节点。点击选中，悬停高亮，支持显隐切换与拖拽落点提示。
 */
export const OutlineTreeNode = observer((props: IOutlineTreeNodeProps) => {
  const { node, workspaceId } = props
  const prefix = usePrefix('outline-tree-node')
  const ctx = useContext(OutlineNodeContext)
  const selection = useSelection(workspaceId)
  const moveHelper = useMoveHelper(workspaceId)
  const cursor = useCursor()
  const [expanded, setExpanded] = useState(true)

  if (!node) return null

  const selected = selection?.selected || []
  const dragging = cursor.status === CursorStatus.Dragging && (moveHelper?.dragNodes?.length || 0) > 0
  const droppable =
    moveHelper?.closestNode?.id === node.id && moveHelper?.outlineClosestDirection === ClosestPosition.Inner
  const state = {
    selected: !dragging && selected.includes(node.id),
    droppable,
  }

  const renderIcon = (target: TreeNode) => {
    if (target.designerProps?.icon) return <IconWidget infer={target.designerProps.icon} size={12} />
    if (target === target.root) return <Icon name="outline" size={12} />
    if (target.designerProps?.droppable) return <Icon name="node" size={12} />
    return <Icon name="node" size={12} />
  }

  const hasChildren = !!(node.children?.length || node === node.root)

  return (
    <div
      className={cx(prefix, props.className, {
        [`${prefix}-expanded`]: expanded,
        [`${prefix}-selected`]: state.selected,
        [`${prefix}-droppable`]: state.droppable,
      })}
      style={props.style}
    >
      <div
        className={`${prefix}-header`}
        style={{ paddingLeft: node.depth * 14 }}
        {...{ 'data-designer-outline-node-id': node.id }}
        onClick={() => {
          selection?.select(node.id)
        }}
      >
        {hasChildren ? (
          <button
            type="button"
            className={cx(`${prefix}-expand`, { [`${prefix}-expand-open`]: expanded })}
            aria-label={expanded ? 'collapse' : 'expand'}
            onClick={event => {
              event.preventDefault()
              event.stopPropagation()
              setExpanded(!expanded)
            }}
          >
            <Icon name="chevron-right" size={10} />
          </button>
        ) : (
          <span className={`${prefix}-expand-placeholder`} />
        )}
        <span className={`${prefix}-icon`}>{renderIcon(node)}</span>
        <span className={`${prefix}-title`}>
          {ctx.renderTitle ? ctx.renderTitle(node) : <NodeTitleWidget node={node} />}
        </span>
        <span className={`${prefix}-actions`} data-click-stop-propagation>
          {ctx.renderActions?.(node)}
          {node !== node.root ? (
            <button
              type="button"
              className={cx(`${prefix}-eye`, { [`${prefix}-eye-hidden`]: node.hidden })}
              aria-label={node.hidden ? 'show' : 'hide'}
              onClick={event => {
                event.preventDefault()
                event.stopPropagation()
                node.hidden = !node.hidden
              }}
            >
              <Icon name={node.hidden ? 'eye-close' : 'eye'} size={13} />
            </button>
          ) : null}
        </span>
      </div>
      {expanded && node.children?.length ? (
        <div className={`${prefix}-children`}>
          {node.children.map(child => (
            <OutlineTreeNode key={child.id} node={child} workspaceId={workspaceId} />
          ))}
        </div>
      ) : null}
    </div>
  )
})

OutlineTreeNode.displayName = 'OutlineTreeNode'
