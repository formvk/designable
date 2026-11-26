import type { ITreeNode, TreeNode, WorkbenchTypes } from '@formvk/designable-core'
import { reportError } from '@formvk/designable-core'
import { requestIdle } from '@formvk/designable-shared'
import { observer } from '@formvk/reactive-react'
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'

import { useTree, useWorkbench } from '../hooks'
import { Viewport } from '../Viewport'

export interface IViewPanelProps {
  type: WorkbenchTypes
  children: (tree: TreeNode, onChange: (tree: ITreeNode) => void) => ReactElement
  scrollable?: boolean
  dragTipsDirection?: 'left' | 'right'
  className?: string
}

/**
 * 视图面板：按工作台类型切换设计画布与只读视图。
 */
export const ViewPanel = observer((props: IViewPanelProps) => {
  const { type, scrollable = true, dragTipsDirection } = props
  const workbench = useWorkbench()
  const currentType = workbench.type
  const tree = useTree()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (currentType === type) {
      requestIdle(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
    }
  }, [currentType, type])

  if (currentType !== type || !tree) return null

  const render = () =>
    props.children(tree, payload => {
      void tree
        .from(payload)
        .then(() => tree.takeSnapshot())
        .catch(reportError)
    })

  if (type === 'DESIGNABLE') {
    return <Viewport dragTipsDirection={dragTipsDirection}>{render()}</Viewport>
  }

  return (
    <div
      className={props.className}
      style={{
        overflow: scrollable ? 'auto' : 'hidden',
        height: '100%',
        cursor: 'auto',
        userSelect: 'text',
      }}
    >
      {visible ? render() : null}
    </div>
  )
})

ViewPanel.displayName = 'ViewPanel'
