import type { IResource, IResourceLike } from '@formvk/designable-core'
import { isResourceHost, isResourceList } from '@formvk/designable-core'
import { Icon } from '@formvk/designable-react-icons'
import { isFn } from '@formvk/shared'
import { isValidElement, useState } from 'react'
import type { ReactNode } from 'react'

import { usePrefix } from '../../hooks'
import { cx } from '../../utils'
import { IconWidget } from '../IconWidget'
import { TextWidget } from '../TextWidget'

export type SourceMapper = (resource: IResource) => ReactNode

export interface IResourceWidgetProps {
  title?: ReactNode
  sources?: IResourceLike[]
  className?: string
  defaultExpand?: boolean
  children?: SourceMapper
}

export interface IResourceNodeWidgetProps {
  prefix: string
  source: IResource
}

const ResourceNodeWidget = (props: IResourceNodeWidgetProps) => {
  const { prefix, source } = props
  const { node, icon, thumb, span } = source
  const title = source.title || node.children[0]?.getMessage('title')
  return (
    <div
      className={`${prefix}-item`}
      style={{ gridColumnStart: `span ${span || 1}` }}
      data-designer-source-id={node.id}
    >
      {thumb ? <img className={`${prefix}-item-thumb`} src={thumb} alt="" draggable={false} /> : null}
      {icon ? (
        isValidElement(icon) ? (
          <span className={`${prefix}-item-icon`}>{icon}</span>
        ) : (
          <IconWidget className={`${prefix}-item-icon`} infer={icon} size={24} />
        )
      ) : null}
      <span className={`${prefix}-item-text`}>
        <TextWidget>{title}</TextWidget>
      </span>
    </div>
  )
}

ResourceNodeWidget.displayName = 'ResourceNodeWidget'

/**
 * 组件资源分组。资源节点带有 source 属性，由引擎拖拽效果接管。
 */
export const ResourceWidget = (props: IResourceWidgetProps) => {
  const { className, title, defaultExpand = true } = props
  const prefix = usePrefix('resource')
  const [expand, setExpand] = useState(defaultExpand)

  const sources = (props.sources || []).reduce<IResource[]>((buf, source) => {
    if (isResourceList(source)) return buf.concat(source)
    if (isResourceHost(source)) return buf.concat(source.Resource || [])
    return buf
  }, [])

  const remainItems =
    sources.reduce((length, source) => {
      return length + (source.span ?? 1)
    }, 0) % 3

  return (
    <div className={cx(prefix, className, { [`${prefix}-expand`]: expand })}>
      <button type="button" className={`${prefix}-header`} onClick={() => setExpand(!expand)}>
        <span className={`${prefix}-header-expand`}>
          <Icon name="chevron-right" size={10} />
        </span>
        <span className={`${prefix}-header-content`}>
          <TextWidget>{title}</TextWidget>
        </span>
      </button>
      {expand ? (
        <div className={`${prefix}-content`}>
          {sources.map((source, index) =>
            isFn(props.children) ? (
              <>{props.children(source)}</>
            ) : (
              <ResourceNodeWidget key={source.node?.id || index} prefix={prefix} source={source} />
            )
          )}
          {remainItems ? (
            <div className={`${prefix}-item-remain`} style={{ gridColumnStart: `span ${3 - remainItems}` }} />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

ResourceWidget.displayName = 'ResourceWidget'
