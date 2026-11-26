import { Node } from '@formvk/designable-react-icons'
import { observer } from '@formvk/reactive-react'
import type { ReactNode } from 'react'

import { usePrefix, useText, useTree } from '../hooks'
import { DesignerSlot, DESIGNER_SLOTS } from '../plugins'
import { cx } from '../utils'

export interface IEmptyWidgetProps {
  dragTipsDirection?: 'left' | 'right'
  children?: ReactNode
}

/**
 * 画布空态。工作区没有任何节点时展示。
 */
export const EmptyWidget = observer((props: IEmptyWidgetProps) => {
  const tree = useTree()
  const prefix = usePrefix('empty-widget')
  const emptyPrefix = usePrefix('empty-state')
  const t = useText()
  const isEmpty = !tree?.children?.length

  if (!isEmpty) return null

  return (
    <div className={cx(prefix, `${prefix}-${props.dragTipsDirection || 'left'}`)}>
      {props.children || (
        <DesignerSlot
          name={DESIGNER_SLOTS.canvasEmpty}
          props={{ dragTipsDirection: props.dragTipsDirection }}
          fallback={
            <div className={emptyPrefix}>
              <Node size={40} />
              <div className={`${emptyPrefix}-title`}>{t('viewport.empty', 'Drag components here to start')}</div>
              <div className={`${emptyPrefix}-desc`}>
                {t('viewport.emptyHint', 'Drag a component onto the canvas, or pick a node from outline')}
              </div>
              <div className={`${prefix}-hints`}>
                <span>{t('viewport.select', 'Click to select, hold ⌘ for multi-select')}</span>
                <span>{t('viewport.copy', 'Copy ⌘C / Paste ⌘V')}</span>
                <span>
                  {t('viewport.delete', 'Delete')} <kbd>Delete</kbd>
                </span>
              </div>
            </div>
          }
        />
      )}
    </div>
  )
})

EmptyWidget.displayName = 'EmptyWidget'
