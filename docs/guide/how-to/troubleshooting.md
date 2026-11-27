# 排障

本文按症状列出常见问题的原因与处理方式。原理说明见[响应式模型](/guide/explanation/reactivity)与
[异步变更与历史](/guide/explanation/async-mutations)。

## 组件不随数据变化更新

**现象**：选中节点、修改 props、切换视图后，自定义组件没有重新渲染。

**处理**：组件读取了响应式数据但没有订阅。用 `observer` 包裹组件，或在 hook 内用 `useObserver`：

```tsx
export const Info = observer(() => {
  const selection = useSelection()
  return <span>{selection?.selected.length ?? 0}</span>
})
```

注意：事件回调里读取状态不会建立订阅，必须把读取放回渲染期。

## 点击物料无法选中

**现象**：画布中的组件可见，但点击没有选中框。

**排查**：

1. 物料把 props 透传到根 DOM 了吗？`<div {...props} />`，缺少 `data-designer-node-id` 时无法命中。
2. 是否在组件内部又包了一层不带 props 的元素，并设置了 `pointer-events: none`？
3. 是否选中了根节点？根节点默认不渲染选中框。

## 拖入后没有落点或无法嵌套

**排查**：

1. 父节点是否 `droppable: true`（默认 `true`）。
2. 是否被 `allowAppend` / `allowDrop` 拒绝。
3. 是否处于 `PREVIEW` 视图，只读视图不处理拖拽。
4. 根节点默认不允许拖拽，`allowDrag()` 对根节点返回 `false`。

## 异步 API 看起来没有生效

**现象**：调用 `setWorkbenchType`、`switchWorkspace`、`append` 后界面没有立刻变化。

**处理**：这些 API 返回 Promise。忘记处理时不会报错，但状态更新本身是异步的：

```ts
void workbench.setWorkbenchType('PREVIEW').catch(reportError)
```

连续调用会排队执行；需要确定顺序时使用 `await`。

## 撤销后新做的编辑丢失

**现象**：撤销到历史中间位置，再编辑一次，redo 记录消失。

**原因**：这是预期行为。在历史中间位置产生新变更会截断 redo 分支。

**处理**：如果业务需要保留分支，应在历史之外自行保存快照。

## 撤销操作与新编辑互相覆盖

**现象**：撤销的同时拖入节点，恢复结果不稳定。

**原因**：同一工作区的变更进入互斥队列，按调用顺序串行。恢复在途时的新变更会等恢复完成后再落地。

**处理**：无需额外处理；不要在队列任务内部再次调用 `triggerMutation`，否则会自我等待。

## 切换 UI 语言后节点标题不变

**原因**：UI 文案与节点文案是两套 i18n 实例。`Designer` 的 `locale` 只影响 UI 文案。

**处理**：同步注册表语言：

```ts
engine.registry.setDesignerLanguage(locale)
```

详见[国际化](/guide/how-to/i18n)。

## 插件重复挂载或不生效

**排查**：

1. `plugins` 是否保持引用稳定？每次渲染创建新数组会重复执行 `setup`。
2. 槽位 `id` 是否与其他插件冲突？同 id 后注册的会覆盖先注册的。
3. `setup` 是否返回了清理函数？热更新场景缺少清理会残留监听。

## 快捷键无效

**排查**：

1. 焦点是否在输入框或 iframe 内。
2. 是否注册了 `shortcut` 管道中间件并短路了匹配。
3. 快捷键实例是否通过 `createDesigner({ shortcuts: [...] })` 注册。

## 设计器样式缺失

**现象**：面板结构正常但样式错乱。

**原因**：`prefixCls` 与样式编译时的 Less 前缀不一致。开发模式下控制台会输出 `prefixCls` 不一致的警告。

**处理**：使用默认前缀 `dr`，或基于 `style.less` 重新声明 `@dr-prefix` 后自行编译。

## 预览 / JSON / 代码视图空白

**排查**：

1. 是否渲染了对应 `type` 的 `ViewPanel`。
2. `ViewPanel` 的 children 是否为函数（`(tree, onChange) => ReactElement`）。
3. 工作台类型是否已切换：`await workbench.setWorkbenchType('JSONTREE')`。

## 根节点没有选中框

这是预期行为：根节点（`depth === 0`）不渲染选中框，避免覆盖整个画布。根节点的选中状态仍可通过
`selection.selected` 读取。

## 进一步定位

- 在 `nodeMutation` / `command` 管道中打印中间件上下文，确认事件是否到达。
- 临时给物料根元素加边框，确认 DOM 上是否注入了 `data-designer-node-id`。
- 用 `tree.serializeSync()` 在控制台检查当前树结构。
