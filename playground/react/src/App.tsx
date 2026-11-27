import type { ITreeNode } from '@formvk/designable-core'
import { createDesigner } from '@formvk/designable-core'
import {
  ComponentTreeWidget,
  CompositePanel,
  Designer,
  HistoryWidget,
  OutlineTreeWidget,
  ResourceListWidget,
  SettingsPanel,
  StudioPanel,
  ToolbarPanel,
  ViewPanel,
  ViewportPanel,
  Workbench,
  WorkspacePanel,
} from '@formvk/designable-react'
import { Icon } from '@formvk/designable-react-icons'
import { Button, ConfigProvider as AntdConfigProvider, Space, theme as antdTheme } from 'antd'
import { useState } from 'react'

import { components, resources } from './components'
import { plugins } from './plugins'

const engine = createDesigner()

const TAG_MAP: Record<string, string> = {
  Root: 'div',
  Container: 'section',
  Card: 'article',
  Text: 'span',
  Button: 'button',
}

const serializeMarkup = (node: ITreeNode, depth = 0): string => {
  const pad = '  '.repeat(depth)
  const tag = TAG_MAP[node.componentName] || 'div'
  const title = node.props?.title
  const attrs = title ? ` title="${String(title)}"` : ''
  const text = title ? String(title) : ''
  const children = (node.children || []).map(child => serializeMarkup(child, depth + 1))
  const inner = [text ? `${pad}  ${text}` : '', ...children].filter(Boolean).join('\n')
  if (!inner) return `${pad}<${tag}${attrs}></${tag}>`
  return `${pad}<${tag}${attrs}>\n${inner}\n${pad}</${tag}>`
}

const Canvas = () => <ComponentTreeWidget components={components} />

const JSONView = ({ tree }: { tree: ITreeNode }) => <pre className="demo-code">{JSON.stringify(tree, null, 2)}</pre>

export const App = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [locale, setLocale] = useState('zh-CN')

  const actions = (
    <Space size={8}>
      <Button size="small" title="Switch language" onClick={() => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN')}>
        {locale === 'zh-CN' ? 'EN' : '中'}
      </Button>
      <Button
        size="small"
        title="Switch theme"
        icon={<Icon name={theme === 'light' ? 'moon' : 'sun'} size={14} />}
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      >
        {theme === 'light' ? 'Dark' : 'Light'}
      </Button>
    </Space>
  )

  return (
    <AntdConfigProvider
      theme={{
        algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#007aff',
          borderRadius: 8,
          fontSize: 13,
        },
      }}
    >
      <Designer engine={engine} theme={theme} locale={locale} position="absolute" plugins={plugins}>
        <Workbench>
          <StudioPanel
            logo={
              <span className="demo-logo">
                <span className="demo-logo-mark">
                  <Icon name="node" size={15} />
                </span>
                <span className="demo-logo-text">
                  FormVK <span>Designable</span>
                </span>
              </span>
            }
            actions={actions}
          >
            <CompositePanel>
              <CompositePanel.Item title="panel.resources" icon={<Icon name="node" size={16} />}>
                <ResourceListWidget sources={[resources]} />
              </CompositePanel.Item>
              <CompositePanel.Item title="panel.outline" icon={<Icon name="outline" size={16} />}>
                <OutlineTreeWidget />
              </CompositePanel.Item>
              <CompositePanel.Item title="panel.history" icon={<Icon name="history" size={16} />}>
                <HistoryWidget />
              </CompositePanel.Item>
            </CompositePanel>
            <WorkspacePanel>
              <ToolbarPanel />
              <WorkspacePanel.Item flexable>
                <ViewportPanel>
                  <ViewPanel type="DESIGNABLE">{() => <Canvas />}</ViewPanel>
                  <ViewPanel type="PREVIEW">{() => <Canvas />}</ViewPanel>
                  <ViewPanel type="JSONTREE">{tree => <JSONView tree={tree.serializeSync()} />}</ViewPanel>
                  <ViewPanel type="MARKUP">
                    {tree => <pre className="demo-code">{serializeMarkup(tree.serializeSync())}</pre>}
                  </ViewPanel>
                </ViewportPanel>
              </WorkspacePanel.Item>
            </WorkspacePanel>
            <SettingsPanel />
          </StudioPanel>
        </Workbench>
      </Designer>
    </AntdConfigProvider>
  )
}
