import { reportError } from '@formvk/designable-core'
import { observer } from '@formvk/reactive-react'

import { usePrefix, useWorkbench } from '../../hooks'
import { cx } from '../../utils'
import { TextWidget } from '../TextWidget'

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 历史记录列表。点击任意记录跳转到该快照。
 */
export const HistoryWidget = observer(() => {
  const workbench = useWorkbench()
  const prefix = usePrefix('history')

  const workspace = workbench.activeWorkspace || workbench.currentWorkspace
  if (!workspace) return null
  const history = workspace.history
  return (
    <div className={prefix}>
      {history.list().map((item, index) => {
        const token = (item.type || 'default_state').replace(/:/g, '_')
        return (
          <button
            type="button"
            className={cx(`${prefix}-item`, {
              [`${prefix}-item-active`]: history.current === index,
            })}
            key={item.timestamp}
            onClick={() => {
              void history.goTo(index).catch(reportError)
            }}
          >
            <span className={`${prefix}-item-title`}>
              <TextWidget token={`operations.${token}`} />
            </span>
            <span className={`${prefix}-item-timestamp`}>{formatTime(item.timestamp)}</span>
          </button>
        )
      })}
      {history.list().length === 0 ? (
        <div className={`${prefix}-empty`}>
          <TextWidget token="history.empty" />
        </div>
      ) : null}
    </div>
  )
})

HistoryWidget.displayName = 'HistoryWidget'
