import { DESIGNER_SLOTS, TextWidget, usePrefix, useText } from '@formvk/designable-react'
import type {
  IDesignerPlugin,
  IRenderCompositeHeaderActionsProps,
  IRenderCompositeNavItemProps,
  IRenderResourceSearchProps,
} from '@formvk/designable-react'
import { Icon } from '@formvk/designable-react-icons'
import { Button, Empty, Input, Space, Tooltip } from 'antd'

const NavItem = (props: IRenderCompositeNavItemProps) => {
  const { item, active, direction, showNavTitle, onActivate } = props
  const prefix = usePrefix('composite-panel')
  const title =
    showNavTitle && item.title ? (
      <span className={`${prefix}-nav-title`}>
        <TextWidget>{item.title}</TextWidget>
      </span>
    ) : null

  if (item.shape === 'link') {
    return (
      <a href={item.href} className={`${prefix}-nav-item`}>
        {item.icon}
        {title}
      </a>
    )
  }

  const button = (
    <button
      type="button"
      className={`${prefix}-nav-item${active ? ` ${prefix}-nav-item-active` : ''}`}
      onClick={event => {
        onActivate(event)
        item.onClick?.(event)
      }}
    >
      <span className={`${prefix}-nav-icon`}>{item.icon}</span>
      {title}
    </button>
  )

  if (showNavTitle || !item.title) return button
  return (
    <Tooltip title={<TextWidget>{item.title}</TextWidget>} placement={direction === 'right' ? 'left' : 'right'}>
      {button}
    </Tooltip>
  )
}

const HeaderActions = (props: IRenderCompositeHeaderActionsProps) => {
  const t = useText()
  return (
    <Space size={0}>
      <Tooltip title={props.pinning ? t('common.collapse', 'Collapse') : t('common.more', 'More')}>
        <Button
          type="text"
          size="small"
          icon={<Icon name={props.pinning ? 'lock' : 'unlock'} size={13} />}
          onClick={props.onTogglePinning}
        />
      </Tooltip>
      <Tooltip title={t('common.close', 'Close')}>
        <Button type="text" size="small" icon={<Icon name="close" size={13} />} onClick={props.onClose} />
      </Tooltip>
    </Space>
  )
}

const SettingsEmpty = () => {
  const t = useText()
  return (
    <div style={{ padding: '48px 16px' }}>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span>
            {t('settings.empty', 'Select a node to configure its props')}
            <br />
            <span style={{ opacity: 0.6 }}>{t('settings.placeholder', 'Select a node to edit its props')}</span>
          </span>
        }
      />
    </div>
  )
}

const ResourceSearch = (props: IRenderResourceSearchProps) => (
  <Input
    size="small"
    allowClear
    value={props.value}
    placeholder={props.placeholder}
    prefix={<Icon name="search" size={13} />}
    onChange={event => props.onChange(event.target.value)}
  />
)

const CanvasEmpty = () => {
  const t = useText()
  return (
    <div className="demo-canvas-empty">
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('viewport.empty', 'Drag components here to start')} />
      <div className="demo-canvas-empty-hints">
        <span>{t('viewport.select', 'Click to select, hold ⌘ for multi-select')}</span>
        <span>{t('viewport.copy', 'Copy ⌘C / Paste ⌘V')}</span>
        <span>
          {t('viewport.delete', 'Delete')} <kbd>Delete</kbd>
        </span>
      </div>
    </div>
  )
}

export const panelsPlugin: IDesignerPlugin = {
  name: 'demo.panels',
  setup(ctx) {
    ctx.slots.register(DESIGNER_SLOTS.compositeNavItem, { id: 'demo.nav-item', component: NavItem })
    ctx.slots.register(DESIGNER_SLOTS.compositeHeaderActions, { id: 'demo.header-actions', component: HeaderActions })
    ctx.slots.register(DESIGNER_SLOTS.settingsEmpty, { id: 'demo.settings-empty', component: SettingsEmpty })
    ctx.slots.register(DESIGNER_SLOTS.resourceSearch, { id: 'demo.resource-search', component: ResourceSearch })
    ctx.slots.register(DESIGNER_SLOTS.canvasEmpty, { id: 'demo.canvas-empty', component: CanvasEmpty })
  },
}
