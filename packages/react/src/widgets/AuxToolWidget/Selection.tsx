import type { TreeNode } from '@formvk/designable-core'
import { CursorStatus } from '@formvk/designable-core'
import type { IRect } from '@formvk/designable-shared'
import { observer } from '@formvk/reactive-react'
import type { CSSProperties } from 'react'

import { useCursor, useDesigner, useMoveHelper, usePrefix, useSelection, useTree } from '../../hooks'
import { useValidNodeOffsetRect } from '../../hooks/useValidNodeOffsetRect'
import { Helpers } from './Helpers'
import { ResizeHandler } from './ResizeHandler'
import { TranslateHandler } from './TranslateHandler'

export interface ISelectionBoxProps {
  node: TreeNode
  showHelpers: boolean
}

const createSelectionStyle = (rect?: IRect): CSSProperties => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: rect?.width,
  height: rect?.height,
  boxSizing: 'border-box',
  transform: rect ? `perspective(1px) translate3d(${rect.x}px,${rect.y}px,0)` : undefined,
})

/**
 * 单个节点的选中框，附带缩放手柄、自由移动手柄与操作工具条。
 */
export const SelectionBox = (props: ISelectionBoxProps) => {
  const designer = useDesigner()
  const prefix = usePrefix('aux-selection-box')
  const innerPrefix = usePrefix('aux-selection-box-inner')
  const rect = useValidNodeOffsetRect(props.node)

  if (!rect || !rect.width || !rect.height) return null

  const selectionId = {
    [designer.props.nodeSelectionIdAttrName]: props.node.id,
  }

  return (
    <div {...selectionId} className={prefix} style={createSelectionStyle(rect)}>
      <div className={innerPrefix} />
      <ResizeHandler node={props.node} />
      <TranslateHandler node={props.node} />
      {props.showHelpers ? <Helpers node={props.node} nodeRect={rect} /> : null}
    </div>
  )
}

SelectionBox.displayName = 'SelectionBox'

/**
 * 选中框集合。拖拽进行中且存在触摸节点时隐藏，避免与插入线冲突。
 */
export const Selection = observer(() => {
  const selection = useSelection()
  const tree = useTree()
  const cursor = useCursor()
  const moveHelper = useMoveHelper()

  if (!selection || !tree) return null
  if (cursor.status !== CursorStatus.Normal && moveHelper?.touchNode) return null
  return (
    <>
      {selection.selected.map(id => {
        const node = tree.findById(id)
        if (!node || node.hidden || node.depth === 0) return null
        return <SelectionBox key={id} node={node} showHelpers={selection.selected.length === 1} />
      })}
    </>
  )
})

Selection.displayName = 'Selection'
