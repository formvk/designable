import type { TreeNode } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'
import { globalThisPolyfill } from '@formvk/shared'
import { useLayoutEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { useOutline, usePrefix, useTree, useWorkbench } from '../../hooks'
import { cx } from '../../utils'
import { TextWidget } from '../TextWidget'
import { OutlineNodeContext } from './context'
import { OutlineInsertion } from './Insertion'
import { OutlineTreeNode } from './OutlineNode'

export interface IOutlineTreeWidgetProps {
  title?: ReactNode
  className?: string
  style?: CSSProperties
  onClose?: () => void
  renderTitle?: (node: TreeNode) => ReactNode
  renderActions?: (node: TreeNode) => ReactNode
}

/**
 * 大纲树。挂载 outline 视口，用于计算拖拽落点与插入线位置。
 */
export const OutlineTreeWidget = observer((props: IOutlineTreeWidgetProps) => {
  const { className, style, renderActions, renderTitle } = props
  const prefix = usePrefix('outline-tree')
  const workbench = useWorkbench()
  const workspace = workbench.activeWorkspace || workbench.currentWorkspace
  const workspaceId = workspace?.id
  const tree = useTree(workspaceId)
  const outline = useOutline(workspaceId)
  const ref = useRef<HTMLDivElement>(null)
  const outlineRef = useRef<typeof outline>(undefined)

  useLayoutEffect(() => {
    if (!workspaceId) return
    if (outlineRef.current && outlineRef.current !== outline) {
      outlineRef.current.onUnmount()
    }
    if (ref.current && outline) {
      outline.onMount(ref.current, globalThisPolyfill)
    }
    outlineRef.current = outline
    if (!outline) return
    return () => {
      outline.onUnmount()
    }
  }, [workspaceId, outline])

  if (!outline || !workspaceId) return null

  return (
    <OutlineNodeContext.Provider value={{ renderTitle, renderActions }}>
      <div className={cx(`${prefix}-container`, className)} style={style}>
        <div className={`${prefix}-header`}>
          <span className={`${prefix}-title`}>{props.title ?? <TextWidget token="outline.title" />}</span>
        </div>
        <div ref={ref} className={`${prefix}-content`}>
          <OutlineTreeNode node={tree!} workspaceId={workspaceId} />
          <div className={`${prefix}-aux`}>
            <OutlineInsertion workspaceId={workspaceId} />
          </div>
        </div>
      </div>
    </OutlineNodeContext.Provider>
  )
})

OutlineTreeWidget.displayName = 'OutlineTreeWidget'

export { OutlineTreeNode }
