import { Icon } from '@formvk/designable-react-icons'
import type { ReactNode } from 'react'

import { usePrefix, useText } from '../hooks'
import { DesignerSlot, DESIGNER_SLOTS } from '../plugins'
import { TextWidget } from '../widgets/TextWidget'

export interface ISettingPanelProps {
  title?: ReactNode
  extra?: ReactNode
  children?: ReactNode
}

/**
 * 属性设置面板容器。本期只提供容器与空态。
 */
export const SettingsPanel = (props: ISettingPanelProps) => {
  const prefix = usePrefix('settings-panel')
  const emptyPrefix = usePrefix('empty-state')
  const t = useText()
  return (
    <div className={prefix}>
      <div className={`${prefix}-header`}>
        <div className={`${prefix}-header-title`}>{props.title ?? <TextWidget token="settings.title" />}</div>
        {props.extra ? <div className={`${prefix}-header-extra`}>{props.extra}</div> : null}
      </div>
      <div className={`${prefix}-body`}>
        {props.children ?? (
          <DesignerSlot
            name={DESIGNER_SLOTS.settingsEmpty}
            fallback={
              <div className={emptyPrefix}>
                <Icon name="setting" size={28} />
                <div className={`${emptyPrefix}-title`}>
                  {t('settings.empty', 'Select a node to configure its props')}
                </div>
                <div className={`${emptyPrefix}-desc`}>
                  {t('settings.placeholder', 'Select a node to edit its props')}
                </div>
              </div>
            }
          />
        )}
      </div>
    </div>
  )
}

SettingsPanel.displayName = 'SettingsPanel'
