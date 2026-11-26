import type { WorkbenchTypes } from '@formvk/designable-core'
import { reportError } from '@formvk/designable-core'
import { DESIGNER_SLOTS, useObserver, useText, useWorkbench } from '@formvk/designable-react'
import type { IDesignerPlugin } from '@formvk/designable-react'
import { Icon } from '@formvk/designable-react-icons'
import { Segmented } from 'antd'

const VIEW_ICONS: Record<string, 'code' | 'preview' | 'outline' | 'node'> = {
  DESIGNABLE: 'node',
  PREVIEW: 'preview',
  JSONTREE: 'outline',
  MARKUP: 'code',
}

const ViewTools = () => {
  const workbench = useWorkbench()
  const type = useObserver(() => workbench.type)
  const t = useText()

  const labelOf = (value: WorkbenchTypes) => {
    if (value === 'DESIGNABLE') return t('view.design', 'Design')
    if (value === 'PREVIEW') return t('view.preview', 'Preview')
    if (value === 'JSONTREE') return t('view.json', 'JSON')
    return t('view.code', 'Code')
  }

  return (
    <Segmented
      size="small"
      value={type}
      options={(['DESIGNABLE', 'PREVIEW', 'JSONTREE', 'MARKUP'] as WorkbenchTypes[]).map(value => ({
        value,
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name={VIEW_ICONS[value] || 'node'} size={13} />
            {labelOf(value)}
          </span>
        ),
      }))}
      onChange={value => {
        void workbench.setWorkbenchType(value as WorkbenchTypes).catch(reportError)
      }}
    />
  )
}

export const viewToolsPlugin: IDesignerPlugin = {
  name: 'demo.view-tools',
  setup(ctx) {
    ctx.slots.register(DESIGNER_SLOTS.toolbarLeft, {
      id: 'demo.view-tools',
      component: ViewTools,
    })
  },
}
