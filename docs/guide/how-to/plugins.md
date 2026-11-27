# 插件与插槽

本文解决一个问题：在不修改 `@formvk/designable-react` 内置组件的前提下，向设计器添加按钮、空态、面板项，
或在命令执行前后插入逻辑。

## 步骤 1：定义插件

插件是一个 `{ name, setup }` 对象。`setup` 接收 `ctx`，可以注册插槽、管道中间件，并返回清理函数：

```tsx
import { reportError } from '@formvk/designable-core'
import type { IDesignerPlugin } from '@formvk/designable-react'
import { DESIGNER_SLOTS, observer, useDesigner, useText } from '@formvk/designable-react'

const SaveButton = observer(() => {
  const engine = useDesigner()
  const t = useText()

  const save = () => {
    const workspace = engine.workbench.currentWorkspace
    if (!workspace) return
    void workspace.operation
      .serialize()
      .then(data => localStorage.setItem('designer:tree', JSON.stringify(data)))
      .catch(reportError)
  }

  return (
    <button type="button" onClick={save}>
      {t('actions.save', '保存')}
    </button>
  )
})

export const savePlugin: IDesignerPlugin = {
  name: 'demo.save',
  setup(ctx) {
    return ctx.slots.register(DESIGNER_SLOTS.toolbarRight, {
      id: 'demo.save',
      order: 10,
      component: SaveButton,
    })
  },
}
```

- `id` 在同一个槽位内唯一，后注册的同 id 条目会覆盖先注册的。
- `order` 控制渲染顺序，升序排列，默认 0。
- `setup` 返回的函数会在插件卸载时执行；`slots.register` 本身也返回 disposer。

## 步骤 2：注册插件

```tsx
<Designer engine={engine} plugins={[savePlugin]}>
```

`plugins` 需要保持引用稳定（不要每次渲染创建新数组），否则会重复执行 `setup`。

## 可用槽位

| 槽位                     | 场景                     | props                                |
| ------------------------ | ------------------------ | ------------------------------------ |
| `toolbarLeft`            | 画布工具栏左侧           | 无                                   |
| `toolbarRight`           | 画布工具栏右侧           | 无                                   |
| `compositeNavItem`       | 左侧面板导航项           | `IRenderCompositeNavItemProps`       |
| `compositeHeaderActions` | 面板头部操作区           | `IRenderCompositeHeaderActionsProps` |
| `settingsEmpty`          | 设置面板无选中时的空态   | 无                                   |
| `resourceSearch`         | 资源面板搜索框           | `IRenderResourceSearchProps`         |
| `auxSelector`            | 选中节点顶部的层级选择器 | `IRenderAuxSelectorProps`            |
| `auxActions`             | 选中节点顶部的操作按钮   | `IRenderAuxActionsProps`             |
| `canvasEmpty`            | 画布空态                 | `IRenderCanvasEmptyProps`            |

常用的 props：

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

## 更多场景

**替换画布空态**

```tsx
const EmptyState = (props: IRenderCanvasEmptyProps) => (
  <div className="empty">拖入物料开始设计</div>
)

setup(ctx) {
  ctx.slots.register(DESIGNER_SLOTS.canvasEmpty, {
    id: 'demo.empty',
    component: EmptyState,
  })
}
```

**追加选中节点的操作按钮**

```tsx
const ExtraAction = observer((props: IRenderAuxActionsProps) => {
  const selected = useSelected()
  return (
    <button type="button" onClick={() => console.log(selected)}>
      日志
    </button>
  )
})
```

`auxActions` 仅在节点被选中时渲染，适合放置复制、删除之外的扩展操作。

**用管道拦截命令**

```ts
import { DESIGNER_PIPELINES } from '@formvk/designable-react'

setup(ctx) {
  return ctx.pipeline.use(DESIGNER_PIPELINES.command, (context, next) => {
    if (context.action === 'remove') return // 不调用 next 即阻止删除
    return next()
  })
}
```

七个管道：`nodeMutation`、`command`、`dragDrop`、`serialize`、`deserialize`、`shortcut`、`workbench`，均支持
异步中间件。

## 验证

1. 工具栏右侧出现「保存」按钮。
2. 点击后 `localStorage` 中出现 `designer:tree`。
3. 刷新页面后按钮没有重复出现（插件只注册一次）。

## 注意事项

- 插件组件的响应式读取需要 `observer` 或 `useObserver`。
- `setup` 中注册的副作用应该返回清理函数，避免热更新时重复挂载。
- 同 id 的槽位条目会覆盖，调试时先检查 id 是否冲突。

完整插件示例见 `playground/react/src/plugins/`。
