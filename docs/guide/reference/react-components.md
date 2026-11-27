# React 组件

`@formvk/designable-react` 的组件 API。所有组件读取的响应式状态都由 `observer` 订阅，使用方无需再包裹。

## 根组件

```ts
interface IDesignerProps {
  engine: Engine
  locale?: string
  fallbackLocale?: string
  messages?: IDesignerLocales
  icons?: IDesignerIcons
  plugins?: IDesignerPlugin[]
  prefixCls?: string
  theme?: 'light' | 'dark' | 'auto'
  variables?: Record<string, string>
  position?: 'fixed' | 'absolute' | 'relative'
  className?: string
  style?: CSSProperties
  children?: ReactNode
}
```

`Designer` 创建引擎上下文、UI 配置与插件注册表，不直接渲染内容。

```ts
interface IConfigProviderProps {
  prefixCls?: string // 默认 'dr'
  theme?: 'light' | 'dark' | 'auto' // 默认 'light'
  locale?: string
  fallbackLocale?: string // 默认 'en-US'
  messages?: IDesignerLocales
  icons?: IDesignerIcons
  variables?: Record<string, string>
  position?: 'fixed' | 'absolute' | 'relative' // 默认 'fixed'
  className?: string
  style?: CSSProperties
  children?: ReactNode
}
```

`ConfigProvider` 用于在没有 `Designer` 时共享主题、语言与图标配置；`variables` 会以 `--<key>` 写入根元素。

```ts
interface IDesignerLayoutProps extends IConfigProviderProps {
  children?: ReactNode
}
```

`Layout` 是带主题容器的布局壳，未提供 `ConfigProvider` 时内部自行创建。

## 容器

```ts
interface IWorkbenchProps {
  children?: ReactNode
}

interface IWorkspaceProps {
  id?: string // 默认 'index'
  title?: string
  description?: string
  children?: ReactNode
}

interface IViewportProps extends Omit<HTMLAttributes<HTMLDivElement>, 'placeholder'> {
  placeholder?: ReactNode
  dragTipsDirection?: 'left' | 'right'
}
```

`Workbench` 渲染当前工作区；`Workspace` 单独挂载某个工作区的上下文；`Viewport` 提供画布 DOM 与滚动态。

```ts
interface ISimulatorProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}
```

## 面板

```ts
interface IStudioPanelProps {
  logo?: ReactNode
  actions?: ReactNode
  className?: string
  style?: CSSProperties
  prefixCls?: string
  theme?: 'light' | 'dark' | 'auto'
  position?: 'fixed' | 'absolute' | 'relative'
  children?: ReactNode
}

interface ICompositePanelProps {
  direction?: 'left' | 'right' // 默认 'left'
  showNavTitle?: boolean
  defaultOpen?: boolean // 默认 true
  defaultPinning?: boolean // 默认 false
  defaultActiveKey?: number | string
  activeKey?: number | string
  onChange?: (activeKey?: number | string) => void
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

interface ICompositePanelItemProps {
  key?: number | string
  shape?: 'tab' | 'button' | 'link' // 默认 'tab'
  title?: ReactNode
  icon?: ReactNode
  href?: string
  onClick?: (event: MouseEvent<HTMLElement>) => void
  extra?: ReactNode
  className?: string
  children?: ReactNode
}

interface IWorkspaceItemProps {
  style?: CSSProperties
  className?: string
  flexable?: boolean // 默认 false
  children?: ReactNode
}
```

`WorkspacePanel` 与 `WorkspacePanel.Item` 负责画布的纵向分栏；`ViewportPanel` 与 `ToolbarPanel` 的 props 均为
`IWorkspaceItemProps`。`ToolbarPanel` 未传 children 时渲染 `toolbar.left` / `toolbar.right` 两个槽位。

```ts
interface IViewPanelProps {
  type: WorkbenchTypes
  children: (tree: TreeNode, onChange: (tree: ITreeNode) => void) => ReactElement
  scrollable?: boolean // 默认 true
  dragTipsDirection?: 'left' | 'right'
  className?: string
}

interface ISettingPanelProps {
  title?: ReactNode
  extra?: ReactNode
  children?: ReactNode
}
```

`ViewPanel` 只在 `workbench.type` 与自身 `type` 相同时渲染 children，可用于 `DESIGNABLE`、`PREVIEW`、
`JSONTREE`、`MARKUP`。

## Widgets

```ts
interface IComponentTreeWidgetProps {
  components: IDesignerComponents
  className?: string
  style?: CSSProperties
}
```

`ComponentTreeWidget` 按 `componentName` 从 `components` 中取物料并递归渲染组件树。

```ts
interface IResourceListWidgetProps extends Omit<IResourceWidgetProps, 'title'> {
  sources?: IResourceLike[]
  expandSource?: SourceType[]
}

interface IResourceWidgetProps {
  title?: ReactNode
  sources?: IResourceLike[]
  className?: string
  defaultExpand?: boolean // 默认 true
  children?: (resource: IResource) => ReactNode
}
```

`ResourceListWidget` 是资源面板的完整实现；`ResourceWidget` 可单独渲染一组资源，并通过 `children` 自定义条目。

```ts
interface IOutlineTreeWidgetProps {
  title?: ReactNode
  className?: string
  style?: CSSProperties
  onClose?: () => void
  renderTitle?: (node: TreeNode) => ReactNode
  renderActions?: (node: TreeNode) => ReactNode
}

interface INodeTitleWidgetProps {
  node: TreeNode
}

interface IIconWidgetProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  infer?: string | ReactNode | { shadow?: string; light?: string; dark?: string } | null
  size?: number | string // 默认 '1em'
  tooltip?: ReactNode | boolean
}

interface ITextWidgetProps {
  componentName?: string
  sourceName?: string
  token?: string | IDesignerMiniLocales
  defaultMessage?: string | IDesignerMiniLocales
  children?: ReactNode
}

interface IEmptyWidgetProps {
  dragTipsDirection?: 'left' | 'right'
  children?: ReactNode
}
```

| 组件                | 说明                                                         |
| ------------------- | ------------------------------------------------------------ |
| `HistoryWidget`     | 历史记录列表，无 props                                       |
| `OutlineTreeWidget` | 大纲树，支持自定义标题与操作                                 |
| `NodeTitleWidget`   | 渲染节点的 `designerLocales.title`                           |
| `IconWidget`        | 按名称推断图标，`infer` 支持字符串、ReactNode 或明暗主题对象 |
| `TextWidget`        | 文案渲染，优先级 token → children → defaultMessage           |
| `EmptyWidget`       | 画布空态，默认展示拖拽提示                                   |
| `GhostWidget`       | 拖拽跟随层，无 props                                         |
| `AuxToolWidget`     | 选中框、悬停框、吸附线与插入占位，无 props                   |

`AuxToolWidget` 的子组件（`Selector`、`Selection`、`Helpers`、`DragHandler`、`ResizeHandler`、
`TranslateHandler`）未从包根导出，需要时从 `widgets/AuxToolWidget/*` 路径导入。

## 模拟器

```ts
interface IPCSimulatorProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

interface IMobileSimulatorProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

interface IResponsiveSimulatorProps {
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

enum ResizeHandleType {
  Resize = 'RESIZE',
  ResizeWidth = 'RESIZE_WIDTH',
  ResizeHeight = 'RESIZE_HEIGHT',
}

interface IResizeHandleProps {
  type: ResizeHandleType
  children?: ReactNode
}
```

## 未从包根导出的接口

以下组件或接口仅在模块内导出，使用时可从对应路径导入：

| 名称                                        | 路径                                            |
| ------------------------------------------- | ----------------------------------------------- |
| `TreeNodeWidget`、`ITreeNodeWidgetProps`    | `widgets/ComponentTreeWidget`                   |
| `IComponentTreeWidgetProps`                 | `widgets/ComponentTreeWidget`                   |
| `ITextWidgetProps`、`INodeTitleWidgetProps` | `widgets/TextWidget`、`widgets/NodeTitleWidget` |
| `IIconWidgetProps`、`IEmptyWidgetProps`     | `widgets/IconWidget`、`widgets/EmptyWidget`     |
| `OutlineTreeNode`、`IOutlineTreeNodeProps`  | `widgets/OutlineWidget/OutlineNode`             |
| AuxToolWidget 子组件与 props                | `widgets/AuxToolWidget/*`                       |

跨包使用时优先通过包根导出；上述路径用于深度定制。
