# 快速开始

本教程带你从零搭建一个可运行的设计器：安装依赖、定义物料、渲染界面，最后验证拖入、选中与撤销。
过程中不展开原理，相关背景见[架构](/guide/explanation/architecture)、[响应式模型](/guide/explanation/reactivity)
与[异步变更](/guide/explanation/async-mutations)。

## 你将完成

一个包含资源面板、画布与属性面板的设计器页面，支持从资源面板拖入组件、点击选中、删除与撤销。

## 前置条件

- Node.js >= 22.12
- 一个可运行的 React + TypeScript 项目
- 包管理器使用 pnpm

## 步骤 1：安装依赖

```bash
pnpm add @formvk/designable-core @formvk/designable-react @formvk/designable-react-icons
```

`@formvk/designable-react` 会一并安装 `@formvk/designable-core` 与 `@formvk/designable-i18n`。

## 步骤 2：创建引擎

新建 `src/designer.ts`。`createDesigner` 会注册默认的事件驱动、effects 与快捷键：

```ts
import { createDesigner } from '@formvk/designable-core'

export const engine = createDesigner()
```

引擎是全局单例，整个应用共用一个即可。

## 步骤 3：定义物料

新建 `src/components.tsx`。物料由三部分组成：React 组件、Behavior（设计器能力与文案）、Resource（资源面板条目）。

```tsx
import { createBehavior, createResource } from '@formvk/designable-core'
import type { IDesignerComponents } from '@formvk/designable-react'

const Input = (props: Record<string, any>) => <input {...props} />

const InputBehavior = createBehavior({
  name: 'Input',
  selector: 'Input',
  designerProps: {
    resizable: { width: true, height: true },
  },
  designerLocales: {
    'zh-CN': { title: '输入框' },
    'en-US': { title: 'Input' },
  },
})

export const components: IDesignerComponents = {
  Input: Object.assign(Input, { Behavior: InputBehavior }),
}

export const resources = createResource('Displays', {
  title: { 'zh-CN': '输入框', 'en-US': 'Input' },
  icon: 'code',
  elements: [{ componentName: 'Input', props: {} }],
})
```

物料组件必须把收到的 props 透传到根 DOM（`{...props}`），设计器依赖其中的 `data-designer-node-id` 做点击命中。

## 步骤 4：渲染界面

新建 `src/App.tsx`：

```tsx
import {
  ComponentTreeWidget,
  CompositePanel,
  Designer,
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

import { components, resources } from './components'
import { engine } from './designer'

export const App = () => (
  <Designer engine={engine}>
    <Workbench>
      <StudioPanel
        logo={
          <span>
            <Icon name="node" size={15} /> Designable
          </span>
        }
      >
        <CompositePanel>
          <CompositePanel.Item title="panel.resources" icon={<Icon name="node" size={16} />}>
            <ResourceListWidget sources={[resources]} />
          </CompositePanel.Item>
        </CompositePanel>
        <WorkspacePanel>
          <ToolbarPanel />
          <WorkspacePanel.Item flexable>
            <ViewportPanel>
              <ViewPanel type="DESIGNABLE">{() => <ComponentTreeWidget components={components} />}</ViewPanel>
            </ViewportPanel>
          </WorkspacePanel.Item>
        </WorkspacePanel>
        <SettingsPanel />
      </StudioPanel>
    </Workbench>
  </Designer>
)
```

在你的 React 入口渲染 `<App />`，并为设计器容器预留整屏高度，例如：

```tsx
import { createRoot } from 'react-dom/client'

import { App } from './App'

createRoot(document.getElementById('root')!).render(<App />)
```

## 步骤 5：验证

启动开发服务器后依次验证：

1. 资源面板出现「输入框」，拖入画布后生成一个输入框。
2. 点击输入框，出现选中框与缩放手柄。
3. 拖拽手柄可调整尺寸。
4. 选中后按 `Delete` 删除，按 `⌘Z`（Windows/Linux 为 `Ctrl+Z`）撤销删除。

若第 2 步无反应，检查物料是否把 `props` 透传到了根 DOM。

## 下一步

- 理解模型分层与数据流：[架构](/guide/explanation/architecture)
- 理解组件为什么能自动更新：[响应式模型](/guide/explanation/reactivity)
- 理解 Promise 与撤销的排队行为：[异步变更与历史](/guide/explanation/async-mutations)
- 扩展物料、国际化与插件：见后续的「操作指南」与「API 参考」章节
