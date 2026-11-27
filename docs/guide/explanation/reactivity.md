# 响应式模型

Designable 的模型使用 `@formvk/reactive` 的装饰器声明状态，视图层通过 `observer` / `useObserver` 订阅。
本文解释装饰器的选择依据、依赖收集的时机，以及 React 组件为什么会（或不会）更新。

## 装饰器与选择依据

| 装饰器        | 行为                              | 典型用途                       |
| ------------- | --------------------------------- | ------------------------------ |
| `@shallowRef` | 仅整体替换时触发                  | 枚举、id、布尔值、坐标对象     |
| `@shallow`    | 数组 / 对象顶层变更触发           | `children` 等容器字段          |
| `@reactive`   | 深层响应式，读写子属性都会触发    | `TreeNode.props`               |
| `@observable` | 深层响应式对象                    | 嵌套配置                       |
| `@computed`   | getter 按实例缓存，依赖变化时失效 | `depth`、`isRoot`、`allowUndo` |
| `@action`     | 批量更新，合并依赖通知            | 会同时修改多个字段的方法       |

选择原则：字段是“整体替换”还是“内部修改”。`componentName` 只会整体替换，用 `@shallowRef`；`props` 会被
直接写子属性（`node.props.label = '用户名'`），必须用 `@reactive`。

## 为什么必须写 accessor

```ts
export class Cursor {
  @shallowRef accessor position: ICursorPosition = DEFAULT_POSITION
}
```

标准装饰器只能拦截属性读写。`accessor` 把字段编译为 getter / setter，装饰器才能接管；写成普通字段会丢失
响应性，重新赋值后也不会通知。

## 依赖收集发生在读取时

响应式系统没有“声明依赖”的步骤，只有读取：

- 在 `observer` 组件或 `useObserver` 回调里读取某个字段，就订阅该字段。
- 在事件回调、`setTimeout` 中读取不会建立订阅，因为此时不在渲染期。
- `@action` 内的多次修改会被合并为一次通知。
- `@computed` 的 getter 在依赖变化前不会重复计算。

这也是为什么 `useObserver(() => workbench.type)` 有效，而普通 `const type = workbench.type` 不会触发更新。

## observer 与 useObserver

`@formvk/reactive-react` 提供两种订阅方式：

```tsx
// 组件级：整个组件渲染期读取的响应式数据都会订阅
export const SelectionInfo = observer(() => {
  const selection = useSelection()
  return <span>{selection?.selected.length ?? 0}</span>
})
```

```tsx
// 局部 / hook 级：只订阅回调内的读取
export const useSelectedIds = () => {
  const selection = useSelection()
  return useObserver(() => selection?.selected || [])
}
```

选择依据：

| 场景                             | 推荐方式            |
| -------------------------------- | ------------------- |
| 面板、工具栏组件整体依赖模型     | `observer` 包裹组件 |
| 自定义 hook 需要独立保持订阅     | `useObserver`       |
| 只读取一次、不需要更新的静态数据 | 无需订阅            |

`useObserver` 的意义在于 hook 不能假设调用方已包裹 `observer`。`@formvk/designable-react` 的内置组件均已使用
`observer`，hooks 内部则按需使用 `useObserver`。

## 物料组件为什么通常不需要 observer

画布中的物料组件由 `TreeNodeWidget` 在渲染时组装 props：

```tsx
const componentProps = {
  ...node.designerProps?.defaultProps,
  ...node.props,
  ...node.designerProps?.getComponentProps?.(node),
  [designer.props.nodeIdAttrName as string]: node.id,
}
```

`node.props` 的读取发生在 `TreeNodeWidget`（已用 `observer` 包裹）内部，props 变化会触发它重新渲染，并把新的
普通对象传给物料。物料自身只消费 props，不需要再次订阅。

如果物料需要读取节点本身（例如展示选中态），用 `useTreeNode()` 拿到响应式节点，或用 `observer` 包裹。

## 常见陷阱

**在事件回调里读取状态，期望触发更新**

只有渲染期的读取才会建立订阅。回调里的读取用于取值，不会让组件在将来更新；需要更新时把读取放回渲染期。

**条件分支导致依赖变化**

依赖集合以最近一次渲染的读取为准。切换分支后，之前分支的依赖会被取消订阅，这是预期行为。

**对 props 做浅拷贝后失去响应**

`{ ...node.props }` 会得到普通对象，后续对 `node.props` 的修改不会反映到拷贝上。需要持续响应时直接使用
响应式对象，或通过 `observer` 在渲染期读取。

**快照恢复后组件没有更新**

历史恢复会替换整棵树的数据。只要组件在渲染期通过 `tree.findById()` 等响应式路径读取节点，`observer` 会
感知变化；如果缓存了 `TreeNode` 实例并在非渲染期使用，需要重新按 id 查找。

## 与装饰器搭配的约定

- 字段优先使用 `accessor`，避免自定义 getter / setter 丢失装饰器。
- 派生值用 `@computed`，不要在渲染时重复计算。
- 多字段变更收敛到一个 `@action` 方法，减少无效渲染。
- 不在模型中使用 React 状态；UI 临时状态（折叠、输入框草稿）留在组件内。
