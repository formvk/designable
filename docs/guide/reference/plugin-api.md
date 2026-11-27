# 插件 API

插件通过 `Designer` 的 `plugins` 挂载，可以注册槽位组件与管道中间件。

## 插件定义

```ts
interface IDesignerPlugin {
  name: string
  setup(ctx: IDesignerPluginContext): void | (() => void)
}

interface IDesignerPluginContext {
  engine: Engine
  slots: IDesignerSlotRegistry
  pipeline: IDesignerPipeline
}
```

`setup` 在插件挂载时执行，返回的函数在卸载时执行。`setup` 只在 `plugins` 引用变化时重新运行。

## 槽位注册表

```ts
interface IDesignerSlotEntry<P extends object = Record<string, unknown>> {
  id: string
  order?: number
  component: ComponentType<P>
}

interface IDesignerSlotRegistry {
  register<P extends object>(name: string, entry: IDesignerSlotEntry<P>): () => void
  get(name: string): IDesignerSlotEntry<any>[]
  subscribe(listener: () => void): () => void
}

createSlotRegistry(): IDesignerSlotRegistry
```

- `register` 返回注销函数。
- 同一槽位内 `id` 唯一，后注册的条目覆盖先注册的。
- `order` 升序排列，默认 0。

## 提供者与渲染

```ts
interface IDesignerPluginProviderProps {
  plugins?: IDesignerPlugin[]
  children?: ReactNode
}

useDesignerSlotRegistry(): IDesignerSlotRegistry | null
```

`DesignerPluginProvider` 创建注册表并执行插件；通常由 `Designer` 内部使用，自定义入口时可手动包裹。

```ts
interface IDesignerSlotProps<P extends object = Record<string, never>> {
  name: string
  props?: P
  fallback?: ReactNode
}
```

`<DesignerSlot name={...} props={...} fallback={...} />` 渲染某个槽位注册的全部组件，无注册时渲染
`fallback`。

## 内置槽位

```ts
const DESIGNER_SLOTS = {
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

| 槽位                       | props 接口                           | 渲染位置                   |
| -------------------------- | ------------------------------------ | -------------------------- |
| `toolbar.left`             | 无                                   | 画布工具栏左侧             |
| `toolbar.right`            | 无                                   | 画布工具栏右侧             |
| `composite.nav-item`       | `IRenderCompositeNavItemProps`       | 左侧面板导航项             |
| `composite.header-actions` | `IRenderCompositeHeaderActionsProps` | 面板头部操作区             |
| `settings.empty`           | 无                                   | 设置面板无选中节点时的空态 |
| `resource.search`          | `IRenderResourceSearchProps`         | 资源面板搜索框             |
| `aux.selector`             | `IRenderAuxSelectorProps`            | 选中节点顶部的层级选择器   |
| `aux.actions`              | `IRenderAuxActionsProps`             | 选中节点顶部的操作按钮     |
| `canvas.empty`             | `IRenderCanvasEmptyProps`            | 画布空态                   |

槽位 props：

```ts
interface IRenderCompositeNavItemProps {
  item: ICompositePanelItemProps
  active: boolean
  direction: 'left' | 'right'
  showNavTitle?: boolean
  onActivate: (event: MouseEvent<HTMLElement>) => void
}

interface IRenderCompositeHeaderActionsProps {
  pinning: boolean
  onTogglePinning: () => void
  onClose: () => void
}

interface IRenderResourceSearchProps {
  value: string
  onChange: (next: string) => void
  placeholder?: string
}

interface IRenderAuxSelectorProps {
  node: TreeNode
}

interface IRenderAuxActionsProps {
  node: TreeNode
  canClone: boolean
  canDelete: boolean
}

interface IRenderCanvasEmptyProps {
  dragTipsDirection?: 'left' | 'right'
}
```

## 管道

`IDesignerPipeline` 与 core 的 `Pipeline` 同签名：

```ts
interface IDesignerPipeline {
  use<C = any, R = any>(name: string, middleware: PipelineMiddleware<C, R>, options?: IPipelineUseOptions): () => void
  run<C = any, R = any>(name: string, context: C, terminal: () => R | Promise<R>): Promise<R>
  has(name: string): boolean
}

const DESIGNER_PIPELINES = {
  nodeMutation: 'node.mutation',
  command: 'command',
  dragDrop: 'drag.drop',
  serialize: 'serialize',
  deserialize: 'deserialize',
  shortcut: 'shortcut',
  workbench: 'workbench',
} as const
```

各管道 context：

```ts
interface INodeMutationContext<T = any> {
  engine: Engine
  workspace?: Workspace
  operation?: Operation
  node: TreeNode
  event: any
  result?: T
}

type ICommandAction = 'remove' | 'clone' | 'undo' | 'redo' | 'goto'

interface ICommandContext<T = any> {
  engine: Engine
  action: ICommandAction
  nodes?: TreeNode[]
  item?: T
  index?: number
  result?: any
}

interface IDragDropContext {
  engine: Engine
  workspace: Workspace
  dragNodes: TreeNode[]
  node?: TreeNode
  direction?: ClosestPosition
}

interface ISerializeContext<T = any> {
  engine: Engine
  workspace?: Workspace
  operation?: Operation
  node: TreeNode
  result?: T
}

interface IDeserializeContext {
  engine: Engine
  workspace?: Workspace
  operation?: Operation
  node: TreeNode
  source?: ITreeNode
}

interface IShortcutContext {
  engine: Engine
  shortcut: Shortcut
  context: IEngineContext
  executed?: boolean
}

interface IWorkbenchContext {
  engine: Engine
  workbench: Workbench
  action: 'switch' | 'type'
  from?: Workspace
  to?: string | Workspace
  id?: string
  type?: WorkbenchTypes
}
```

中间件签名：

```ts
type PipelineMiddleware<C = any, R = any> = (context: C, next: PipelineNext<R>) => MaybePromise<R | void>

interface IPipelineUseOptions {
  id?: string
  order?: number
}
```

不调用 `next()` 即短路终端；同一 `id` 的中间件会被替换。

## 生命周期

1. `Designer` 挂载时创建槽位注册表。
2. 依次执行 `plugins` 中每个插件的 `setup`。
3. `setup` 返回的函数存入清理列表。
4. `plugins` 变化或卸载时，先执行旧插件的清理函数，再执行新插件的 `setup`。

## 示例

```tsx
import type { IDesignerPlugin } from '@formvk/designable-react'
import { DESIGNER_PIPELINES, DESIGNER_SLOTS, observer, useText } from '@formvk/designable-react'

const Badge = observer(() => {
  const t = useText()
  return <span className="badge">{t('demo.badge', 'Beta')}</span>
})

export const badgePlugin: IDesignerPlugin = {
  name: 'demo.badge',
  setup(ctx) {
    const disposeSlot = ctx.slots.register(DESIGNER_SLOTS.toolbarRight, {
      id: 'demo.badge',
      order: 5,
      component: Badge,
    })
    const disposePipeline = ctx.pipeline.use(DESIGNER_PIPELINES.command, (context, next) => {
      if (context.action === 'remove') return
      return next()
    })
    return () => {
      disposeSlot()
      disposePipeline()
    }
  },
}
```
