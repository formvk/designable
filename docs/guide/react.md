# React 视图层

`@formvk/designable-react` 提供设计器的 React 组件、hooks、插件与插槽。

## 安装

```bash
pnpm add @formvk/designable-core @formvk/designable-react
```

## 最小接入

```tsx
import { createDesigner } from '@formvk/designable-core'
import { ComponentTreeWidget, Designer, StudioPanel, ViewPanel, Workbench } from '@formvk/designable-react'

const engine = createDesigner()
const components = {
  // 组件映射，见「自定义组件」
}

export const App = () => (
  <Designer engine={engine}>
    <Workbench>
      <StudioPanel>
        <ViewPanel type="DESIGNABLE">{() => <ComponentTreeWidget components={components} />}</ViewPanel>
      </StudioPanel>
    </Workbench>
  </Designer>
)
```

`Designer` 负责注入主题、语言与插件上下文；`Workbench` 渲染当前工作区；`ViewPanel` 按工作台类型
（`DESIGNABLE` / `PREVIEW` / `JSONTREE` / `MARKUP`）切换视图。

## 响应式绑定

视图层基于 `@formvk/reactive-react` 的 `observer`：组件在渲染期收集依赖，读取到的响应式数据变化时自动重渲染。

```tsx
import { observer, useSelection, useTree } from '@formvk/designable-react'

export const SelectionInfo = observer(() => {
  const selection = useSelection()
  const tree = useTree()
  const id = selection?.selected[0]
  return <span>{id ? tree?.findById(id)?.componentName : '未选中'}</span>
})
```

- 内置组件（选区、悬停框、大纲、历史、资源面板等）均已用 `observer` 包裹。
- 自定义组件读取 `selection.selected`、`workbench.type`、`screen.width`、`node.props` 等响应式数据时必须包裹
  `observer`，否则只有普通 props 变化才会更新。
- 画布内的物料组件由 `TreeNodeWidget` 传入普通 props，通常不需要 `observer`。

需要在 hook 内部保持订阅时使用 `useObserver`：

```tsx
import { useObserver, useSelection, useTree } from '@formvk/designable-react'

export const useSelectedNodes = () => {
  const selection = useSelection()
  const tree = useTree()
  return useObserver(() => (selection?.selected || []).map(id => tree?.findById(id)).filter(Boolean))
}
```

hook 不能假设调用方组件已被 `observer` 包裹，因此 `useObserver` 保证 hook 可以独立使用。示例中的
`plugins/view-tools.tsx`、`plugins/screen-tools.tsx` 均以 `observer` 包裹。

## 国际化

设计器 UI 文案由一个 `I18n` 实例驱动，`language` 与 `locales` 是响应式属性：

```ts
import { createI18n } from '@formvk/designable-i18n'

const i18n = createI18n({
  language: 'zh-CN',
  fallbackLanguage: 'en-US',
  locales: {
    'zh-CN': { 'common.save': '保存' },
    'en-US': { 'common.save': 'Save' },
  },
})

i18n.t('common.save') // 保存
i18n.setLanguage('en-US')
i18n.registerLocales({ 'ja-JP': { 'common.save': '保存する' } })
```

`createI18n` 是 `new I18n(props)` 的工厂函数。`t` 的查找顺序为：当前语言 → `fallbackLanguage` → 任意存在该
token 的语言 → `defaultMessage` → token 本身。

在 React 树中通过 `Designer`（或 `ConfigProvider`）配置语言与追加文案：

```tsx
<Designer engine={engine} locale="en-US" messages={{ 'en-US': { 'common.save': 'Save' } }}>
```

组件内用 `useText()` 获取翻译函数，`TextWidget` 直接渲染 token：

```tsx
const t = useText()
t('common.save', 'Save') // 第二个参数为缺失时的默认文案

<TextWidget token="common.save" />
```

节点文案通过 Behavior 的 `designerLocales` 注册，`node.getMessage('title')` 按当前语言读取：

```ts
createBehavior({
  name: 'Card',
  selector: 'Card',
  designerLocales: {
    'zh-CN': { title: '卡片' },
    'en-US': { title: 'Card' },
  },
})
```

## 自定义组件

物料组件加上 `Behavior` 与 `Resource` 后即可被注册表识别：

```tsx
import { createBehavior, createResource } from '@formvk/designable-core'

const Card = props => <article {...props} />

export const components = {
  Card: Object.assign(Card, {
    Behavior: createBehavior({
      name: 'Card',
      selector: 'Card',
      designerProps: { droppable: true, resizable: { width: true } },
      designerLocales: { 'zh-CN': { title: '卡片' } },
    }),
  }),
}

export const resources = createResource('Layouts', {
  title: { 'zh-CN': '卡片' },
  elements: [{ componentName: 'Card' }],
})
```

完整示例见 `examples/react/src/components.tsx`。

## 插件与插槽

通过 `plugins` 扩展面板、工具栏与画布空态，无需修改内置组件：

```tsx
import type { IDesignerPlugin } from '@formvk/designable-react'
import { DESIGNER_SLOTS, observer, useText } from '@formvk/designable-react'

const SaveButton = observer(() => {
  const t = useText()
  return <button type="button">{t('common.save', 'Save')}</button>
})

const savePlugin: IDesignerPlugin = {
  name: 'demo.save',
  setup(ctx) {
    ctx.slots.register(DESIGNER_SLOTS.toolbarRight, { id: 'demo.save', component: SaveButton })
  },
}
```

示例插件见 `examples/react/src/plugins/`。

## 布局组件

| 组件             | 作用                                |
| ---------------- | ----------------------------------- |
| `StudioPanel`    | 设计器外壳（logo、actions、主区域） |
| `CompositePanel` | 左侧导航与面板容器                  |
| `WorkspacePanel` | 工作区区域                          |
| `ViewportPanel`  | 画布视口容器（含模拟器）            |
| `ToolbarPanel`   | 画布顶部工具栏                      |
| `SettingsPanel`  | 右侧属性设置                        |

## 常用 hooks

| hook                                               | 说明              |
| -------------------------------------------------- | ----------------- |
| `useDesigner`                                      | 当前引擎          |
| `useWorkbench` / `useWorkspace`                    | 工作台 / 工作区   |
| `useTree` / `useOperation`                         | 组件树 / 操作模型 |
| `useSelection` / `useSelected` / `useSelectedNode` | 选区              |
| `useHover` / `useCursor` / `useMoveHelper`         | 悬停、光标、拖拽  |
| `useHistory`                                       | 历史记录          |
| `useScreen`                                        | 屏幕与模拟器状态  |
| `useText` / `useLocale` / `useI18n`                | 国际化            |
| `usePrefix` / `useTheme`                           | 样式前缀与主题    |
