import type { TreeNode } from '@formvk/designable-core'
import { reportError, TreeNode as TreeNodeModel } from '@formvk/designable-core'
import { DESIGNER_SLOTS, IconWidget, NodeTitleWidget, usePrefix, useSelection, useText } from '@formvk/designable-react'
import type { IDesignerPlugin, IRenderAuxActionsProps, IRenderAuxSelectorProps } from '@formvk/designable-react'
import { Icon } from '@formvk/designable-react-icons'
import { Button, Dropdown, Tooltip } from 'antd'

const renderIcon = (target: TreeNode) => {
  if (target.designerProps?.icon) return <IconWidget infer={target.designerProps.icon} />
  if (target === target.root) return <Icon name="outline" />
  return <Icon name="node" />
}

const AuxSelector = (props: IRenderAuxSelectorProps) => {
  const { node } = props
  const prefix = usePrefix('aux-selector')
  const selection = useSelection()
  const parents = node.getParents().slice(0, 4)

  const trigger = (
    <button type="button" className={`${prefix}-title`}>
      {renderIcon(node)}
      <span className={`${prefix}-label`}>
        <NodeTitleWidget node={node} />
      </span>
      {parents.length ? <Icon name="chevron-down" className={`${prefix}-arrow`} /> : null}
    </button>
  )

  if (!parents.length) return trigger

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomLeft"
      menu={{
        items: parents.map(parent => ({
          key: parent.id,
          label: <NodeTitleWidget node={parent} />,
          icon: renderIcon(parent),
        })),
        onClick: ({ key }) => selection?.select(key),
      }}
    >
      {trigger}
    </Dropdown>
  )
}

const AuxActions = (props: IRenderAuxActionsProps) => {
  const { node, canClone, canDelete } = props
  const t = useText()
  return (
    <>
      {canClone ? (
        <Tooltip title={t('icons.copy', 'Clone')}>
          <Button
            type="text"
            size="small"
            icon={<Icon name="copy" />}
            onClick={() => {
              void TreeNodeModel.clone([node]).catch(reportError)
            }}
          />
        </Tooltip>
      ) : null}
      {canDelete ? (
        <Tooltip title={t('icons.delete', 'Delete')}>
          <Button
            type="text"
            size="small"
            danger
            icon={<Icon name="delete" />}
            onClick={() => {
              void TreeNodeModel.remove([node]).catch(reportError)
            }}
          />
        </Tooltip>
      ) : null}
    </>
  )
}

export const auxToolsPlugin: IDesignerPlugin = {
  name: 'demo.aux-tools',
  setup(ctx) {
    ctx.slots.register(DESIGNER_SLOTS.auxSelector, { id: 'demo.aux-selector', component: AuxSelector })
    ctx.slots.register(DESIGNER_SLOTS.auxActions, { id: 'demo.aux-actions', component: AuxActions })
  },
}
