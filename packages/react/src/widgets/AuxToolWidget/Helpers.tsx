import type { TreeNode } from '@formvk/designable-core'
import { reportError, TreeNode as TreeNodeModel } from '@formvk/designable-core'
import { Icon } from '@formvk/designable-react-icons'
import type { IRect } from '@formvk/designable-shared'
import type { CSSProperties } from 'react'

import { usePrefix, useText, useViewport } from '../../hooks'
import { DesignerSlot, DESIGNER_SLOTS } from '../../plugins'
import { cx } from '../../utils'
import { DragHandler } from './DragHandler'
import { Selector } from './Selector'

export interface IHelpersProps {
  node: TreeNode
  nodeRect: IRect
}

/**
 * 选中节点的操作工具条：层级选择、复制、拖拽、删除。
 * 默认悬浮在节点上方，空间不足时贴在节点顶部。
 */
export const Helpers = (props: IHelpersProps) => {
  const { node, nodeRect } = props
  const prefix = usePrefix('aux-helpers')
  const rawButton = usePrefix('raw-button')
  const actionPrefix = usePrefix('aux-action')
  const viewport = useViewport()
  const t = useText()
  const above = nodeRect.y - (viewport?.scrollY || 0) > 34
  const style: CSSProperties = above
    ? { bottom: '100%', right: 0, marginBottom: 6 }
    : { top: 0, right: 0, marginTop: 4 }
  const canClone = node.allowClone() !== false
  const canDelete = node.allowDelete() !== false

  return (
    <div className={prefix} style={style}>
      <Selector node={node} />
      <DesignerSlot
        name={DESIGNER_SLOTS.auxActions}
        props={{ node, canClone, canDelete }}
        fallback={
          <>
            {canClone ? (
              <button
                type="button"
                className={cx(rawButton, actionPrefix)}
                title={t('icons.copy', 'Clone')}
                aria-label={t('icons.copy', 'Clone')}
                onClick={() => {
                  void TreeNodeModel.clone([node]).catch(reportError)
                }}
              >
                <Icon name="copy" />
              </button>
            ) : null}
            {canDelete ? (
              <button
                type="button"
                className={cx(rawButton, actionPrefix, `${actionPrefix}-danger`)}
                title={t('icons.delete', 'Delete')}
                aria-label={t('icons.delete', 'Delete')}
                onClick={() => {
                  void TreeNodeModel.remove([node]).catch(reportError)
                }}
              >
                <Icon name="delete" />
              </button>
            ) : null}
          </>
        }
      />
      {node.allowDrag() === false ? null : <DragHandler node={node} />}
    </div>
  )
}

Helpers.displayName = 'Helpers'
