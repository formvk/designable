# React hooks

`@formvk/designable-react` 导出的全部 hooks。除 `useObserver` / `observer` 外，其余 hook 都需要在 `Designer`
的子树内调用。

## 响应式绑定

```ts
function observer<P, Options extends IObserverOptions = IObserverOptions>(
  component: ReactFC<P>,
  options?: Options
): ObserverComponent<P, Options>

function useObserver<T>(view: () => T, options?: IObserverOptions): T

interface IObserverOptions {
  forwardRef?: boolean
  scheduler?: (updater: () => void) => void
  displayName?: string
}
```

`observer` 订阅组件渲染期读取的响应式数据；`useObserver` 订阅回调内的读取，适合 hook 或局部表达式。

## 引擎与工作台

```ts
useDesigner(): Engine
useWorkbench(): Workbench
useCursor(): Cursor
useScreen(): Screen
useRegistry(): Registry
```

这些 hook 直接返回引擎上的单例模型，读取其响应式字段即可自动订阅。

## 工作区模型

以下 hook 都接受可选的 `workspaceId`；不传时使用当前工作区。

```ts
useWorkspace(workspaceId?: string): Workspace | undefined
useOperation(workspaceId?: string): Operation | undefined
useTree(workspaceId?: string): TreeNode | undefined
useViewport(workspaceId?: string): Viewport | undefined
useOutline(workspaceId?: string): Viewport | undefined
useSelection(workspaceId?: string): Selection | undefined
useHover(workspaceId?: string): HoverModel | undefined
useMoveHelper(workspaceId?: string): MoveHelperModel | undefined
useTransformHelper(workspaceId?: string): TransformHelperModel | undefined
useHistory(workspaceId?: string): History<Workspace> | undefined
```

派生 hook：

```ts
useSelected(workspaceId?: string): string[]
useSelectedNode(workspaceId?: string): TreeNode | undefined
```

`useSelected` 返回选中 id 数组，`useSelectedNode` 返回第一个选中节点。

## UI 配置

```ts
useDesignerContext(): IDesignerContextValue
usePrefix(after = ''): string
useTheme(): 'light' | 'dark'
usePosition(): 'fixed' | 'absolute' | 'relative'
useI18n(): I18n
useLocale(): string
useText(): (token: string, defaultMessage?: string) => string
useComponents(): IDesignerComponents
useTreeNode(): TreeNode | null
useNodeIdProps(node?: { id: string }): { [name: string]: string | undefined }
```

- `usePrefix('panel')` 返回 `'dr-panel'` 形式的类名前缀。
- `useText` 返回翻译函数，第二个参数是缺失时的默认文案。
- `useTreeNode` 读取最近的 `TreeNodeContext`，在物料组件内可获得自身节点。
- `useNodeIdProps(node)` 生成 `{ [nodeIdAttrName]: node.id }`，用于手动标注节点 DOM。

```ts
interface IDesignerContextValue {
  prefixCls: string
  theme: 'light' | 'dark'
  position: 'fixed' | 'absolute' | 'relative'
  i18n: I18n
  icons?: IDesignerIcons
}
```

## 几何

```ts
useValidNodeOffsetRect(node?: TreeNode): IRect | undefined
```

返回节点相对画布的矩形；节点不可见或未挂载时返回 `undefined`。内部用 `useObserver` 跟随布局变化。

## 使用约束

- 在渲染期读取的响应式字段才会建立订阅；事件回调中的读取不会触发更新。
- hook 内部需要保持订阅时使用 `useObserver`，不要假设调用方已包裹 `observer`。
- 物料组件通常不需要任何订阅 hook，引擎注入的 props 变化会由 `TreeNodeWidget` 触发重渲染。
- 在 `Designer` 子树之外调用会抛错或返回 `undefined`（依赖 context）。

更多背景见[响应式模型](/guide/explanation/reactivity)。
