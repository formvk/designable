import type { TreeNode } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'
import { createElement, Fragment, useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { DesignerComponentsContext, TreeNodeContext } from '../context'
import { useComponents, useDesigner, usePrefix } from '../hooks'
import type { IDesignerComponents } from '../types'
import { cx } from '../utils'

export interface IComponentTreeWidgetProps {
  components: IDesignerComponents
  className?: string
  style?: CSSProperties
}

export interface ITreeNodeWidgetProps {
  node: TreeNode
  children?: ReactNode
}

/**
 * 渲染单个设计节点。组件本身由 components 映射决定。
 */
export const TreeNodeWidget = observer((props: ITreeNodeWidgetProps) => {
  const { node } = props
  const designer = useDesigner()
  const components = useComponents()

  const renderNode = () => {
    if (!node || node.hidden) return null
    const Component = components[node.componentName]
    if (!Component) {
      if (node.children?.length) {
        return (
          <Fragment>
            {node.children.map(child => (
              <TreeNodeWidget key={child.id} node={child} />
            ))}
          </Fragment>
        )
      }
      return null
    }
    const componentProps: Record<string, unknown> = {
      ...node.designerProps?.defaultProps,
      ...node.props,
      ...node.designerProps?.getComponentProps?.(node),
      [designer.props.nodeIdAttrName as string]: node.id,
    }
    if (node.depth === 0) delete componentProps.style
    const children = node.designerProps?.selfRenderChildren
      ? []
      : (node.children || []).map(child => <TreeNodeWidget key={child.id} node={child} />)
    return createElement(Component, componentProps, ...children)
  }

  if (!node) return null
  return <TreeNodeContext.Provider value={node}>{renderNode()}</TreeNodeContext.Provider>
})

TreeNodeWidget.displayName = 'TreeNodeWidget'

/**
 * 组件树入口。负责注册 behaviors 并提供组件映射。
 */
export const ComponentTreeWidget = observer((props: IComponentTreeWidgetProps) => {
  const { components } = props
  const designer = useDesigner()
  const tree = designer.workbench.currentWorkspace?.operation.tree
  const prefix = usePrefix('component-tree')

  useEffect(() => {
    designer.registry.registerDesignerBehaviors(components)
  }, [designer, components])

  if (!tree) return null

  return (
    <div
      className={cx(prefix, props.className)}
      style={{ ...props.style, ...tree.props?.style }}
      {...{ [designer.props.nodeIdAttrName as string]: tree.id }}
    >
      <DesignerComponentsContext.Provider value={components}>
        <TreeNodeWidget node={tree} />
      </DesignerComponentsContext.Provider>
    </div>
  )
})

ComponentTreeWidget.displayName = 'ComponentTreeWidget'
