# React 包 Headless 化：命名 Slot 插件机制 + 可选主题 + 示例端 antd 6

## 1. 摘要

把 `@formvk/designable-react` 从「自带一套视觉控件」改造为「结构层 + 命名插槽插件机制」：

- 删除包内全部 15 个视觉控件（`src/components`）与 `controls.less`。
- 删除两个纯 UI 工具条 `DesignerToolsWidget`、`ViewToolsWidget`，改由应用端插件通过命名 slot 注入。
- 新增 DSH 风格的插件机制：`Designer.plugins` + `ctx.slots.register(name, { id, order, component })` + `<DesignerSlot name fallback />`。
- 所有结构性组件接入命名 slot，未注册插件时回退到**极简原生元素**（无皮肤）。
- 包内默认 CSS（`style.css`）只保留布局、画布辅助层与极简回退样式；现有视觉皮肤抽成**可选默认主题**（`theme.css` / `theme.less`）。应用可只引结构、完全用自己的组件库接管 UI。
- 示例端 `examples/react` 使用 **antd 6**，通过插件实现工具栏、搜索、空态、辅助操作、层级选择器等 UI。

约束不变：只读参考子仓库 `designable/` 零改动；`pnpm check` 全绿；中文文案；包不新增任何 UI 库依赖。

## 2. 现状分析（已核对）

- 内部对 `src/components` 的依赖共 9 处：`CompositePanel`、`SettingsPanel`、`EmptyWidget`、`ResourceListWidget`、`IconWidget`、`Helpers`、`Selector`、`DesignerToolsWidget`、`ViewToolsWidget`。
- 15 个控件中 `Switch/Tabs/Collapse/Divider` 仅公共导出、内部未使用；其余 11 个被上述 9 个文件使用。
- `styles/index.less` 当前顺序引入 `tokens/base/controls/widgets/panels/simulators`，`src/index.ts` 无条件 `import './styles/index.less'`，产物为 `dist/index.css`。
- `package.json` exports 仅 `.` / `./style.css` / `./style.less` / `./package.json`。
- 已有可复用的结构插槽：`CompositePanel.Item`、`OutlineTreeWidget.renderTitle/renderActions`、`ResourceWidget.children`、`ViewPanel.children`、`StudioPanel.logo/actions`、`Viewport.placeholder`、`EmptyWidget.children`，本次继续保留。
- `packages/react/src/hooks/useDesigner.ts` 提供 `useDesigner/useScreen`，`useWorkspace.ts` 提供 `useHistory/useSelection/useHover/useViewport/useTree`，插件组件可直接复用。
- 示例端当前只有 core/react/react-icons/react，`App.tsx` 直接使用 `DesignerToolsWidget/ViewToolsWidget`；`main.tsx` 引入 `style.css`。
- antd 6 用法已在兄弟仓库确认：`ConfigProvider` + `theme.darkAlgorithm/defaultAlgorithm`（`@formvk/antd` 的 `docs/demos/DemoTheme.tsx`）。

## 3. 方案总览

```
Designer(plugins) ──> DesignerPluginProvider ──> slot registry ──> DesignerSlot(name)
                              │                                       │
                              └── plugin.setup(ctx) ── ctx.slots.register(name, entry)
                                                                       └── 无注册时渲染 fallback（极简原生）
样式：
  style.css  = 结构/布局/辅助层/极简回退（默认引入）
  theme.css  = 现有视觉皮肤（可选引入，示例引入）
```

## 4. 详细改动

### 4.1 新增插件内核 `packages/react/src/plugins/`

新增目录与文件：

| 文件                         | 内容                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `types.ts`                   | `IDesignerSlotEntry`、`IDesignerSlotRegistry`、`IDesignerPluginContext`、`IDesignerPlugin` |
| `SlotRegistry.ts`            | `createSlotRegistry()`，含快照缓存，保证 `useSyncExternalStore` 快照稳定                   |
| `slots.ts`                   | `DESIGNER_SLOTS` 常量与各 slot 的 props 契约类型                                           |
| `DesignerPluginProvider.tsx` | 创建 registry、执行 `plugin.setup`、卸载时释放注册与 cleanup                               |
| `DesignerSlot.tsx`           | 订阅 registry，按 `order` 渲染；无条目时渲染 `fallback`                                    |
| `index.ts`                   | 统一导出                                                                                   |

核心类型（决策已定）：

```ts
export interface IDesignerSlotEntry<P extends object = Record<string, unknown>> {
  id: string
  order?: number
  component: ComponentType<P>
}

export interface IDesignerSlotRegistry {
  register<P extends object>(name: string, entry: IDesignerSlotEntry<P>): () => void
  get(name: string): IDesignerSlotEntry<any>[]
  subscribe(listener: () => void): () => void
}

export interface IDesignerPluginContext {
  engine: Engine
  slots: IDesignerSlotRegistry
}

export interface IDesignerPlugin {
  name: string
  setup(ctx: IDesignerPluginContext): void | (() => void)
}
```

行为规则（必须实现）：

1. `register` 按 slot 名分组，同一 `id` 覆盖旧条目并保持原插入位置；返回 disposer，仅当当前存储条目仍是自己时才删除。
2. `get` 按 `order`（默认 0）升序返回；**必须缓存排序后的数组**，仅在注册/注销时失效，避免 `useSyncExternalStore` 无限循环。
3. `subscribe` 返回取消订阅函数。
4. `DesignerPluginProvider` 用 `useState(createSlotRegistry)` 保证 registry 实例稳定；在 `useLayoutEffect` 中依次执行 `plugin.setup(ctx)`（避免首帧闪回退），卸载或 `plugins` 引用变化时先执行插件返回的 cleanup，再释放该次注册的 disposer。
5. `ctx.slots` 是 registry 的包装：`register` 同时收集 disposer；`get/subscribe` 透传。
6. 未包裹 Provider 时 `DesignerSlot` 直接渲染 fallback，不抛错。
7. 文档注明：`plugins` 数组需保持引用稳定（定义在模块作用域或用 `useMemo`）。

`DesignerSlot` 契约：

```tsx
export interface IDesignerSlotProps<P extends object = Record<string, never>> {
  name: string
  props?: P
  fallback?: ReactNode
}
```

- 渲染为 Fragment，不额外包 DOM，避免破坏 flex 布局。
- 每个条目以 `id` 为 key，`component` 接收 `props`。
- 无 Provider / 无条目 → 渲染 `fallback`。

接入 `Designer`：

- `IDesignerProps` 增加 `plugins?: IDesignerPlugin[]`。
- `Designer` 解构 `plugins`，在 `DesignerEngineContext.Provider` 内、`DesignerShell` 外包一层 `DesignerPluginProvider`。
- `src/index.ts` 增加 `export * from './plugins'`，删除 `export * from './components'`。

### 4.2 命名 slot 约定

`DESIGNER_SLOTS` 常量：

```ts
export const DESIGNER_SLOTS = {
  toolbarLeft: 'toolbar.left',
  toolbarRight: 'toolbar.right',
  compositeNavItem: 'composite.nav-item',
  compositeHeaderActions: 'composite.header-actions',
  settingsEmpty: 'settings.empty',
  resourceSearch: 'resource.search',
  auxSelector: 'aux.selector',
  auxActions: 'aux.actions',
  canvasEmpty: 'canvas.empty',
} as const
```

| slot                       | 渲染位置            | props                                                   | 未注册时的回退                                                        |
| -------------------------- | ------------------- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| `toolbar.left`             | `ToolbarPanel` 左端 | `{}`                                                    | 不渲染                                                                |
| `toolbar.right`            | `ToolbarPanel` 右端 | `{}`                                                    | 不渲染                                                                |
| `composite.nav-item`       | 左侧导航每个页签    | `{ item, active, direction, showNavTitle, onActivate }` | 原生 `button`/`a` + Icon + TextWidget + 原生 `title`                  |
| `composite.header-actions` | 页签头右侧          | `{ pinning, onTogglePinning, onClose }`                 | 两个原生 icon button                                                  |
| `settings.empty`           | 设置面板空态        | `{}`                                                    | `.dr-empty-state`（图标+标题+描述）                                   |
| `resource.search`          | 资源列表顶部        | `{ value, onChange(next: string), placeholder }`        | `<input type="search" class="dr-raw-input">`                          |
| `aux.selector`             | 选中工具条左侧      | `{ node }`                                              | 原生 button + 节点图标 + `NodeTitleWidget`（无下拉）                  |
| `aux.actions`              | 选中工具条操作区    | `{ node, canClone, canDelete }`                         | 原生 icon button（clone/delete）；`DragHandler` 始终由 `Helpers` 渲染 |
| `canvas.empty`             | 画布空态内容        | `{ dragTipsDirection }`                                 | `.dr-empty-state` + 快捷键提示                                        |

`IDesignerNavItem` 直接复用 `ICompositePanelItemProps`（type-only import，避免运行期循环依赖）。

### 4.3 结构组件接入 slot（逐文件）

1. `packages/react/src/panels/ToolbarPanel.tsx`
   - 无 `children` 时渲染 `<><DesignerSlot name="toolbar.left" /><DesignerSlot name="toolbar.right" /></>`；有 `children` 时保持原样（向后兼容自定义工具条）。

2. `packages/react/src/panels/CompositePanel.tsx`
   - 删除 `IconButton/Tooltip` 引用。
   - 抽出内部 `DefaultNavItem`（原生 `button`/`a`、`dr-composite-panel-nav-item` 类名、active 类名、`TextWidget`、原生 `title`）。
   - 每个 item 渲染一个 `DesignerSlot name="composite.nav-item"`，`props` 传 `{ item, active, direction, showNavTitle, onActivate }`，fallback 为 `DefaultNavItem`。
   - 头部按钮改为 `DesignerSlot name="composite.header-actions"`，fallback 为两个原生 button（lock/unlock、close），`title` 使用现有 i18n key（`common.collapse`/`common.more`/`common.close`）。
   - `extra` 仍由面板自身渲染。

3. `packages/react/src/panels/SettingsPanel.tsx`
   - 删除 `Empty` 引用；`props.children ?? <DesignerSlot name="settings.empty" fallback={<div className="dr-empty-state">…</div>} />`。
   - 回退使用 `Icon name="setting"` + `settings.empty` / `settings.placeholder` 文案。

4. `packages/react/src/widgets/EmptyWidget.tsx`
   - 删除 `Empty/Kbd` 引用；保留 `children` 最高优先级：`props.children ?? <DesignerSlot name="canvas.empty" ... fallback={...} />`。
   - 回退：`Node` 图标 + 标题 + 描述 + `.dr-empty-widget-hints`（`<kbd>Delete</kbd>`）。

5. `packages/react/src/widgets/ResourceListWidget/index.tsx`
   - 删除 `SearchInput`；改为 `DesignerSlot name="resource.search"`，`onChange` 直接回传字符串；回退原生 `input`。

6. `packages/react/src/widgets/IconWidget.tsx`
   - 删除 `Tooltip`；`tooltip` prop 保留，但仅用于生成原生 `title`：字符串直接用，`true` 时用现有 `icons.<name>` 翻译，非字符串 ReactNode 不再渲染浮层。

7. `packages/react/src/widgets/AuxToolWidget/Helpers.tsx`
   - 删除 `IconButton`；`Selector` 保持不变。
   - `aux.actions` 槽位替换 clone/delete 两个按钮；fallback 为原生 `button` + `Icon`，类名 `dr-raw-button dr-aux-action`（删除按钮追加 `dr-aux-action-danger`）。
   - `DragHandler` 原样保留在操作区之后，拖拽行为不受插件影响。

8. `packages/react/src/widgets/AuxToolWidget/Selector.tsx`
   - 删除 `Dropdown`；`onMouseEnter` 悬浮逻辑保留在外层。
   - 内部渲染 `DesignerSlot name="aux.selector"`，fallback 为原生按钮（图标 + `NodeTitleWidget`，无下拉箭头）。

9. `packages/react/src/widgets/index.ts`
   - 删除 `DesignerToolsWidget`、`ViewToolsWidget` 的 import/export。

### 4.4 删除内容

- 整个 `packages/react/src/components/`（15 个控件 + `index.ts`）。
- `packages/react/src/widgets/DesignerToolsWidget/`。
- `packages/react/src/widgets/ViewToolsWidget/`。
- `packages/react/src/styles/controls.less`。
- `src/index.ts` 中 `export * from './components'`、两个工具条导出。
- `styles/widgets.less` 中 `.dr-view-tools`、`.dr-designer-tools*` 整段（约 703-728 行）；`.dr-aux-helpers .dr-btn` 改为 `.dr-aux-action`；`.dr-designer-tools-size .dr-input-control` 随工具条一并删除。
- `styles/base.less` 中 `.dr-divider`。
- `styles/tokens.less` 中仅控件使用的变量：`--dr-control-sm/md/lg`、`--dr-font-size-lg`、`--dr-z-popover`、`--dr-z-tooltip`。

### 4.5 样式拆分：结构 vs 可选主题

新增文件：

1. `packages/react/src/styles/variables.less`
   - 仅 `@dr-prefix: dr;`，供结构与主题共用，用户仍可在导入后覆盖。

2. `packages/react/src/styles/structure.less`（结构层，默认产物）
   - 从现有 `panels.less / widgets.less / base.less` **复制**布局声明，去掉颜色、渐变、阴影、圆角、动画；`var(--dr-*)` 换成中性常量。
   - 覆盖：`.dr-app*` 定位与盒模型、`.dr-designer/.dr-workbench/.dr-workspace`、`.dr-main-panel*`、`.dr-composite-panel*`（nav 56、tabs 280、header 42）、`.dr-workspace-panel*`、`.dr-toolbar-panel`（46px、两端对齐）、`.dr-settings-panel*`（296px）、`.dr-viewport`（relative/overflow）、`.dr-component-tree`、`.dr-ghost`、`.dr-icon`、`[hidden]`。
   - 画布辅助层必需规则：`.dr-aux-tool`（absolute inset 0、pointer-events none）、insertion/snap-line/dashed-box/cover/free-selection/selection-box（absolute + 极简 1px 边框）、resize handler（尺寸/定位/cursor）、translate handler、`.dr-aux-helpers`（absolute、pointer-events all）、`.dr-aux-selector*`、`.dr-aux-drag-handler`、`.dr-empty-widget`（absolute inset 0、居中、pointer-events none）。
   - 极简回退样式：`.dr-empty-state*`、`.dr-raw-button`、`.dr-raw-input`、`kbd`、`.dr-empty-widget-hints`。
   - 保留编译期前缀哨兵 `:root { --dr-compiled-prefix: '@{dr-prefix}'; }`（从 `tokens.less` 移入），保证不引主题时前缀告警仍有效。

3. `packages/react/src/styles/theme.less`（可选主题入口）
   - 顺序：`variables` → `tokens` → `base` → `widgets` → `panels` → `simulators` → 新增 `fallback.less`。
   - 新增 `packages/react/src/styles/fallback.less`：`.dr-raw-button`、`.dr-raw-input`、`.dr-empty-state*`、`.dr-aux-action(-danger)` 的完整皮肤（替代原 `controls.less` 中对应视觉）。

修改文件：

- `styles/index.less`：只保留 `@import './variables.less'; @import './structure.less';`。
- `styles/tokens.less`：删除 `@dr-prefix` 与哨兵块（改由 `variables.less` / `structure.less` 提供），保留色板与主题变量。
- `styles/base.less`：保留视觉皮肤；删除 `.dr-divider`；`.dr-empty-widget` 的视觉保留（结构层已有布局）。
- `styles/widgets.less / panels.less / simulators.less`：保留视觉皮肤，仅做 4.4 的删除与 `.dr-aux-action` 替换。

构建与导出：

- `packages/react/vite.config.ts` 的 `copy-less-sources` 插件中，`closeBundle` 使用已安装的 `less` 把 `src/styles/theme.less` 编译为 `dist/theme.css`（`less.render(source, { filename, paths: ['src/styles'] })`），再执行原有目录复制。
- `packages/react/package.json` exports 增加：
  - `"./theme.css": "./dist/theme.css"`
  - `"./theme.less": "./dist/less/styles/theme.less"`
- `src/index.ts` 仍只 `import './styles/index.less'`（结构 CSS），**不**引入主题。

### 4.6 示例端 antd 6 改造

依赖：

- `examples/react/package.json` 增加 `"antd": "^6.7.1"`；不引入 `@ant-design/icons`（继续用 `@formvk/designable-react-icons`）。

新增 `examples/react/src/plugins/`：

| 文件               | 注册的 slot                                                                                           | 实现要点                                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `view-tools.tsx`   | `toolbar.left`                                                                                        | antd `Segmented`，切换 `DESIGNABLE/PREVIEW/JSONTREE/MARKUP`；复用 `useWorkbench/useObserver/useText`                                                                              |
| `screen-tools.tsx` | `toolbar.right`                                                                                       | antd `Space/Button/Segmented/Input/Tooltip`；移植撤销重做、屏幕类型 PC/Mobile/Responsive、宽高输入（blur/Enter 提交）、重置尺寸、横屏翻转                                         |
| `panels.tsx`       | `composite.nav-item`、`composite.header-actions`、`settings.empty`、`resource.search`、`canvas.empty` | nav-item 用 antd `Tooltip` + 结构类名；header-actions 用 `Button type="text"`；空态用 `Empty`；搜索用 `Input`（`prefix` 搜索图标、`allowClear`）；画布空态用 `Empty` + 快捷键提示 |
| `aux-tools.tsx`    | `aux.selector`、`aux.actions`                                                                         | 选择器用 antd `Dropdown menu={{ items, onClick }}`；操作按钮用 `Button type="text"` + `Tooltip`                                                                                   |
| `index.ts`         | —                                                                                                     | 模块作用域导出稳定的 `plugins: IDesignerPlugin[]`                                                                                                                                 |

示例改动：

- `examples/react/src/main.tsx`：依次引入 `@formvk/designable-react/style.css`、`@formvk/designable-react/theme.css`、`./demo.css`（antd 6 为 CSS-in-JS，无需引入 antd 全局样式）。
- `examples/react/src/App.tsx`
  - 移除 `DesignerToolsWidget/ViewToolsWidget` 引用。
  - 用 antd `ConfigProvider` 包裹 `Designer`，`theme.algorithm` 随明暗切换，`token.colorPrimary = '#007aff'`、`token.borderRadius = 8`。
  - `<Designer plugins={plugins} …>`；`<ToolbarPanel />` 不再传子节点。
  - `StudioPanel` 的 logo/actions 可改用 antd `Space/Button`（logo 结构保留）。
- `examples/react/src/demo.css`
  - 删除已不存在的工具条/搜索样式（当前文件已无相关选择器，无需处理）。
  - 新增 `.demo-canvas-empty`（提示区）、`.demo-settings-empty`（内边距）、`kbd` 样式。

### 4.7 导出与类型变更

- `packages/react/src/index.ts`：`+ './plugins'`，`- './components'`，`-` 两个工具条。
- `packages/react/src/types.ts`：`IDesignerProps.plugins?: IDesignerPlugin[]`（type-only import）。
- `packages/react/src/widgets/index.ts`：同步删除两个工具条。
- 其余公共 API 不变；`package.json` 仅新增 theme 入口。

## 5. 假设与决策

1. **插件粒度**：统一命名 slot（用户已选），不做 render props 扩展；已有 `renderTitle/renderActions/children` 保留不动。
2. **样式边界**：可选默认主题（用户已选）。`style.css` 不含视觉皮肤；示例同时引入 `theme.css` 与 antd，演示「结构默认 + 应用接管局部 UI」。
3. **插件生命周期**：setup 返回可选 cleanup；Provider 自动释放注册；`plugins` 按引用比较，需稳定。
4. **回退原则**：原生语义元素 + 结构类名，无第三方依赖、无浮层；`aux.selector` 在未接管时降级为不可展开的节点标题按钮（层级切换仍可通过大纲树完成）。
5. **破坏性变更可接受**：删除 `components`、`DesignerToolsWidget`、`ViewToolsWidget` 公共导出；包处于 beta，迁移方式为应用端插件。
6. **主题前缀**：`theme.css` 以默认 `dr` 前缀预编译；自定义 `prefixCls` 的应用需引入 `theme.less` 重新编译。
7. **只读子仓库**：不修改 `designable/` 目录。

## 6. 验证步骤

```bash
export PATH="$HOME/.nvm/versions/node/v22.23.4/bin:$PATH"
pnpm install
pnpm --filter @formvk/designable-react build
pnpm --filter @formvk/designable-example-react build
pnpm check
git status --short -- designable | wc -l   # 期望 0
```

构建产物检查：

- `dist/index.css` 体积明显下降，且不含 `.dr-composite-panel-nav-item` 的颜色/阴影等皮肤声明。
- 存在 `dist/theme.css`、`dist/less/styles/theme.less`、`dist/less/styles/structure.less`；`dist/less/styles/controls.less` 不存在。
- `dist/index.d.ts` 含 `IDesignerPlugin/DesignerSlot/DESIGNER_SLOTS`，不含 `Button/IconButton/DesignerToolsWidget/ViewToolsWidget`。

浏览器验证（`pnpm --filter @formvk/designable-example-react dev`）：

1. 工具栏出现 antd `Segmented/Button`（DOM 含 `ant-segmented`/`ant-btn`），视图切换、撤销重做、屏幕类型、宽高输入、翻转均可用。
2. 资源搜索过滤、导航页签、页签头操作、设置空态、画布空态均由 antd 渲染。
3. 拖拽组件到画布、选中节点、层级下拉（antd Dropdown）、clone/delete、拖拽手柄正常。
4. 明暗主题切换时 antd 与设计器主题同步，无控制台错误。
5. 临时移除 `theme.css` 引入后再启动，确认仅结构 CSS 时布局不塌、交互可用（验证后恢复）。

## 7. 风险

- `structure.less` 与 `theme.less` 存在有意的布局规则重复，后续改布局需同时检查两处。
- `useSyncExternalStore` 快照必须由 registry 缓存，否则会无限重渲染。
- 插件若在组件内创建 `plugins` 数组会导致反复 setup；文档与示例均使用模块级常量。
- `IconWidget` 的富文本 tooltip 降级为原生 `title`，属于已知 API 行为变化。
