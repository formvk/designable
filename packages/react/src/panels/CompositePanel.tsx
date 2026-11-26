import { Icon } from '@formvk/designable-react-icons'
import { Children, Fragment, isValidElement, useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react'

import { usePrefix, useText } from '../hooks'
import { DesignerSlot, DESIGNER_SLOTS } from '../plugins'
import type { IRenderCompositeHeaderActionsProps, IRenderCompositeNavItemProps } from '../plugins'
import { cx } from '../utils'
import { TextWidget } from '../widgets/TextWidget'

export interface ICompositePanelProps {
  direction?: 'left' | 'right'
  showNavTitle?: boolean
  defaultOpen?: boolean
  defaultPinning?: boolean
  defaultActiveKey?: number | string
  activeKey?: number | string
  onChange?: (activeKey?: number | string) => void
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export interface ICompositePanelItemProps {
  key?: number | string
  shape?: 'tab' | 'button' | 'link'
  title?: ReactNode
  icon?: ReactNode
  href?: string
  onClick?: (event: MouseEvent<HTMLElement>) => void
  extra?: ReactNode
  className?: string
  children?: ReactNode
}

interface IParsedItem extends ICompositePanelItemProps {
  key: number | string
  raw: ReactElement<ICompositePanelItemProps>
}

const parseItems = (children: ReactNode): IParsedItem[] => {
  const items: IParsedItem[] = []
  Children.forEach(children, (child, index) => {
    if (isValidElement<ICompositePanelItemProps>(child) && child.type === CompositePanel.Item) {
      items.push({
        key: child.key ?? index,
        ...child.props,
        raw: child,
      })
    }
  })
  return items
}

const toSlotItem = (item: IParsedItem): ICompositePanelItemProps => ({
  key: item.key,
  shape: item.shape,
  title: item.title,
  icon: item.icon,
  href: item.href,
  onClick: item.onClick,
  extra: item.extra,
  className: item.className,
})

const DefaultNavItem = (props: IRenderCompositeNavItemProps) => {
  const { item, active, showNavTitle, onActivate } = props
  const prefix = usePrefix('composite-panel')
  const t = useText()
  const title =
    showNavTitle && item.title ? (
      <span className={`${prefix}-nav-title`}>
        <TextWidget>{item.title}</TextWidget>
      </span>
    ) : null
  const nativeTitle = !showNavTitle && typeof item.title === 'string' ? t(item.title) : undefined

  if (item.shape === 'link') {
    return (
      <a href={item.href} className={`${prefix}-nav-item`} title={nativeTitle}>
        {item.icon}
        {title}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={cx(`${prefix}-nav-item`, { [`${prefix}-nav-item-active`]: active })}
      title={nativeTitle}
      onClick={event => {
        onActivate(event)
        item.onClick?.(event)
      }}
    >
      <span className={`${prefix}-nav-icon`}>{item.icon}</span>
      {title}
    </button>
  )
}

const DefaultHeaderActions = (props: IRenderCompositeHeaderActionsProps) => {
  const prefix = usePrefix('composite-panel')
  const rawButton = usePrefix('raw-button')
  const t = useText()
  return (
    <>
      <button
        type="button"
        className={cx(rawButton, `${prefix}-tabs-header-pin`)}
        title={props.pinning ? t('common.collapse', 'Collapse') : t('common.more', 'More')}
        aria-label={props.pinning ? t('common.collapse', 'Collapse') : t('common.more', 'More')}
        onClick={props.onTogglePinning}
      >
        <Icon name={props.pinning ? 'lock' : 'unlock'} size={13} />
      </button>
      <button
        type="button"
        className={rawButton}
        title={t('common.close', 'Close')}
        aria-label={t('common.close', 'Close')}
        onClick={props.onClose}
      >
        <Icon name="close" size={13} />
      </button>
    </>
  )
}

/**
 * 复合面板：左侧（或右侧）导航栏 + 可折叠内容区。
 *
 * 使用 `CompositePanel.Item` 声明每个页签。
 */
export const CompositePanel = (props: ICompositePanelProps) => {
  const { direction = 'left', showNavTitle, defaultOpen = true, defaultPinning = false } = props
  const prefix = usePrefix('composite-panel')
  const items = parseItems(props.children)
  const [activeKey, setActiveKey] = useState<number | string | undefined>(props.defaultActiveKey ?? items[0]?.key)
  const [pinning, setPinning] = useState(defaultPinning)
  const [visible, setVisible] = useState(defaultOpen)
  const activeKeyRef = useRef(activeKey)
  activeKeyRef.current = activeKey

  useEffect(() => {
    if (props.activeKey !== undefined && props.activeKey !== activeKeyRef.current) {
      setActiveKey(props.activeKey)
      setVisible(true)
    }
  }, [props.activeKey])

  const currentItem = items.find(item => item.key === activeKey)
  const content = currentItem?.raw.props.children

  const toggleItem = (key: number | string) => {
    if (key === activeKey) {
      setVisible(!visible)
    } else {
      setVisible(true)
      if (props.activeKey === undefined) setActiveKey(key)
    }
    props.onChange?.(key)
  }

  return (
    <div
      className={cx(prefix, props.className, {
        [`${prefix}-right`]: direction === 'right',
      })}
      style={props.style}
    >
      <div className={`${prefix}-nav`}>
        {items.map(item => {
          const active = item.key === activeKey
          const slotProps: IRenderCompositeNavItemProps = {
            item: toSlotItem(item),
            active,
            direction,
            showNavTitle,
            onActivate: () => {
              if ((item.shape ?? 'tab') === 'tab') toggleItem(item.key)
            },
          }
          return (
            <DesignerSlot
              key={item.key}
              name={DESIGNER_SLOTS.compositeNavItem}
              props={slotProps}
              fallback={<DefaultNavItem {...slotProps} />}
            />
          )
        })}
      </div>
      {visible && content ? (
        <div className={cx(`${prefix}-tabs-content`, { [`${prefix}-tabs-content-pinning`]: pinning })}>
          <div className={`${prefix}-tabs-header`}>
            <div className={`${prefix}-tabs-header-title`}>
              <TextWidget>{currentItem.title}</TextWidget>
            </div>
            <div className={`${prefix}-tabs-header-actions`}>
              <div className={`${prefix}-tabs-header-extra`}>{currentItem.extra}</div>
              <DesignerSlot
                name={DESIGNER_SLOTS.compositeHeaderActions}
                props={{
                  pinning,
                  onTogglePinning: () => setPinning(!pinning),
                  onClose: () => setVisible(false),
                }}
                fallback={
                  <DefaultHeaderActions
                    pinning={pinning}
                    onTogglePinning={() => setPinning(!pinning)}
                    onClose={() => setVisible(false)}
                  />
                }
              />
            </div>
          </div>
          <div className={`${prefix}-tabs-body`}>{content}</div>
        </div>
      ) : null}
    </div>
  )
}

CompositePanel.Item = (_props: ICompositePanelItemProps) => <Fragment />

CompositePanel.displayName = 'CompositePanel'
