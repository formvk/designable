import { reportError, ScreenType } from '@formvk/designable-core'
import { DESIGNER_SLOTS, useHistory, useObserver, useScreen, useText } from '@formvk/designable-react'
import type { IDesignerPlugin } from '@formvk/designable-react'
import { Icon } from '@formvk/designable-react-icons'
import { Button, Input, Segmented, Space, Tooltip } from 'antd'
import { useEffect, useState } from 'react'

const ScreenTools = () => {
  const history = useHistory()
  const screen = useScreen()
  const t = useText()
  const allowUndo = useObserver(() => history?.allowUndo)
  const allowRedo = useObserver(() => history?.allowRedo)
  const state = useObserver(() => ({
    type: screen.type,
    width: screen.width,
    height: screen.height,
    flip: screen.flip,
  }))
  const [width, setWidth] = useState(String(state.width))
  const [height, setHeight] = useState(String(state.height))

  useEffect(() => {
    setWidth(String(state.width))
    setHeight(String(state.height))
  }, [state.width, state.height])

  const commitSize = () => {
    const nextWidth = Number(width) || screen.width
    const nextHeight = Number(height) || screen.height
    screen.setSize(nextWidth, nextHeight)
  }

  return (
    <Space size={4} align="center">
      <Space size={0}>
        <Tooltip title={t('icons.undo', 'Undo')}>
          <Button
            type="text"
            size="small"
            disabled={!allowUndo}
            icon={<Icon name="undo" />}
            onClick={() => {
              void history?.undo().catch(reportError)
            }}
          />
        </Tooltip>
        <Tooltip title={t('icons.redo', 'Redo')}>
          <Button
            type="text"
            size="small"
            disabled={!allowRedo}
            icon={<Icon name="redo" />}
            onClick={() => {
              void history?.redo().catch(reportError)
            }}
          />
        </Tooltip>
      </Space>
      <Segmented
        size="small"
        value={state.type}
        options={[
          { value: ScreenType.PC, label: <Icon name="monitor" size={13} /> },
          { value: ScreenType.Mobile, label: <Icon name="phone" size={13} /> },
          { value: ScreenType.Responsive, label: <Icon name="tablet" size={13} /> },
        ]}
        onChange={value => screen.setType(value as ScreenType)}
      />
      {state.type === ScreenType.Mobile ? (
        <Tooltip title={t('view.flip', 'Landscape')}>
          <Button
            type="text"
            size="small"
            icon={<Icon name="tablet" style={{ transform: state.flip ? 'rotate(-90deg)' : undefined }} />}
            onClick={() => screen.setFlip(!state.flip)}
          />
        </Tooltip>
      ) : null}
      {state.type === ScreenType.Responsive ? (
        <>
          <Input
            size="small"
            style={{ width: 64 }}
            value={width}
            onChange={event => setWidth(event.target.value)}
            onBlur={commitSize}
            onPressEnter={commitSize}
          />
          <span style={{ opacity: 0.5 }}>×</span>
          <Input
            size="small"
            style={{ width: 64 }}
            value={height}
            onChange={event => setHeight(event.target.value)}
            onBlur={commitSize}
            onPressEnter={commitSize}
          />
          {state.width !== '100%' || state.height !== '100%' ? (
            <Tooltip title={t('view.recover', 'Reset size')}>
              <Button type="text" size="small" icon={<Icon name="resize" />} onClick={() => screen.resetSize()} />
            </Tooltip>
          ) : null}
        </>
      ) : null}
    </Space>
  )
}

export const screenToolsPlugin: IDesignerPlugin = {
  name: 'demo.screen-tools',
  setup(ctx) {
    ctx.slots.register(DESIGNER_SLOTS.toolbarRight, {
      id: 'demo.screen-tools',
      component: ScreenTools,
    })
  },
}
