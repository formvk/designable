import type { IResource, IResourceLike, SourceType } from '@formvk/designable-core'
import { isResourceHost, isResourceList } from '@formvk/designable-core'
import { isPlainObj, isStr } from '@formvk/shared'
import { useState } from 'react'

import { useLocale, usePrefix, useText } from '../../hooks'
import { DesignerSlot, DESIGNER_SLOTS } from '../../plugins'
import { ResourceWidget } from '../ResourceWidget'
import type { IResourceWidgetProps } from '../ResourceWidget'

export interface IResourceListWidgetProps extends Omit<IResourceWidgetProps, 'title'> {
  sources?: IResourceLike[]
  expandSource?: SourceType[]
  onSearch?: (keyword: string) => boolean
}

/**
 * 资源列表。按资源类型分组并支持关键字过滤。
 */
export const ResourceListWidget = (props: IResourceListWidgetProps) => {
  const { expandSource, sources } = props
  const prefix = usePrefix('resource-list')
  const rawInput = usePrefix('raw-input')
  const t = useText()
  const locale = useLocale()
  const [keyword, setKeyword] = useState('')

  const sourceMap =
    sources?.reduce<Partial<Record<SourceType, IResource[]>>>((buf, source) => {
      let list: IResource[] = []
      if (isResourceHost(source)) {
        list = source.Resource || []
      } else if (isResourceList(source)) {
        list = source
      } else {
        return buf
      }
      list.forEach(item => {
        const group = buf[item.type] || []
        buf[item.type] = group
        group.push(item)
      })
      return buf
    }, {}) || {}

  const readTitle = (source: IResource) => {
    const title = source.title || source.node?.children?.[0]?.getMessage('title') || ''
    if (isStr(title)) return title
    if (isPlainObj(title)) {
      for (const key in title) {
        if (key.toLowerCase() === locale.toLowerCase()) return String(title[key])
      }
      return ''
    }
    return ''
  }

  const matches = (source: IResource) => {
    if (!keyword) return true
    return readTitle(source).toLowerCase().includes(keyword.toLowerCase())
  }

  return (
    <div className={prefix}>
      <div className={`${prefix}-search`}>
        <DesignerSlot
          name={DESIGNER_SLOTS.resourceSearch}
          props={{
            value: keyword,
            onChange: setKeyword,
            placeholder: t('resource.search', 'Search components'),
          }}
          fallback={
            <input
              type="search"
              className={rawInput}
              value={keyword}
              placeholder={t('resource.search', 'Search components')}
              onChange={event => setKeyword(event.target.value)}
            />
          }
        />
      </div>
      {Object.entries(sourceMap).map(([type, list]) => {
        const filtered = (list || []).filter(matches)
        if (!filtered.length) return null
        return (
          <ResourceWidget
            key={type}
            title={`sources.${String(type).toLowerCase()}`}
            sources={[filtered]}
            defaultExpand={expandSource ? expandSource.includes(type) : true}
          />
        )
      })}
      {keyword && !Object.values(sourceMap).some(list => (list || []).some(matches)) ? (
        <div className={`${prefix}-empty`}>{t('resource.empty', 'No matched components')}</div>
      ) : null}
    </div>
  )
}

ResourceListWidget.displayName = 'ResourceListWidget'
