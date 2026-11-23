# 核心模型

`@formvk/designable-core` 的模型直接使用 `@formvk/reactive` 提供的标准装饰器声明响应式：

| 装饰器        | 行为                              |
| ------------- | --------------------------------- |
| `@shallowRef` | 仅整体替换时触发                  |
| `@shallow`    | 数组 / 对象顶层变更触发           |
| `@observable` | 深层响应式                        |
| `@computed`   | getter 按实例缓存，依赖变化时失效 |
| `@action`     | 批量更新，合并依赖通知            |

```ts
export class Cursor {
  @shallowRef accessor position: ICursorPosition = DEFAULT_POSITION

  @action
  setPosition(position: ICursorPosition) {
    this.position = { ...position }
  }
}
```

响应式字段使用 `accessor` 声明，保证重新赋值后仍保持响应性。

## Engine

引擎实例的根，持有 `props`、`cursor`、`workbench`、`keyboard`、`screen`、`viewport`，
并负责事件驱动（`drivers`）。通过 `engine.workbench.addWorkspace()` 创建画布工作区。

## Workbench / Workspace

- `Workbench` 维护多个 `Workspace`，并暴露 `currentWorkspace`。
- `Workspace` 聚合 `operation`、`viewport`、`history`、`shortcuts` 等模型，并负责事件分发。

## Operation / TreeNode

`Operation` 描述一次可序列化的编辑操作（树 + 选中节点），`TreeNode` 是组件树节点：

```ts
const tree = workspace.operation.tree
const input = tree.children[0]

input.props.label = '用户名' // 深层响应式
input.append(new TreeNode({ componentName: 'Button', props: {} }))

tree.serialize() // 快照，供 History 使用
```

`TreeNode` 提供 `find`、`append`、`insertBefore/After`、`takeSnapshot`、`triggerMutation`
等编辑能力，并支持 `GlobalRegistry` 注入的 `designerProps`、`designerLocales`。

## Selection / History

- `selection.select(node)` / `remove(node)` / `batch()` 管理选中节点 id。
- `history.push()` / `undo()` / `redo()` 基于全量快照恢复整棵树，`allowUndo` / `allowRedo` 响应式可用。

## Viewport / 事件

`Viewport` 负责坐标换算、命中测试与滚动数据；`EventDriver` 统一封装鼠标、键盘、拖拽、
滚动和尺寸变化事件，事件通过 `workspace.dispatch(event)` 广播。
