# 全链路异步化改造计划

## Context

当前洋葱管道是纯同步实现：`PipelineMiddleware = (ctx, next) => R | void`，`Pipeline.run` 同步返回 `R`。用户明确选择「全链路异步化」，要求中间件支持 `await`，并接受 `TreeNode` 结构变更、`History` 命令、序列化/反序列化等公开 API 改为 Promise 的 breaking change。

目标：中间件可异步执行（权限校验、远程请求、延迟决策），整条链在 await 后仍保持原有顺序、否决和快照语义；构造函数与 React render 等无法 await 的边界保留同步快照通道。

## 核心决策

1. **Pipeline 全异步**：`run` 返回 `Promise<R>`，`next()` 返回 `Promise<R>`，中间件返回 `MaybePromise<R | void>`；同步/异步中间件混用统一 `await`。重复 `next()` 通过游标检测，返回 rejected Promise。
2. **同步边界**：`TreeNode` 构造函数改用同步私有 `applyNode`，不再调用 `from`；新增 `serializeSync()`（TreeNode/Operation/Workspace），仅供 `History` 构造初始快照与 JSON 展示使用，绕过插件中间件。
3. **事件系统保持同步**：`engine.dispatch`/`Subscribable.dispatch` 不变；异步订阅者和异步快捷键 handler 统一 `void run(...).catch(reportError)`，避免未处理 rejection。
4. **History 串行队列**：`push/undo/redo/goTo` 进入同一 Promise 队列，`locking` 跨 `await from` 用 `try/finally` 保持；连续点击按队列顺序执行。`Operation.snapshot` 通过 requestIdle 调度 `history.push`，History 在 undo/redo/goTo 开始时取消待定快照。
5. **不引入全局结构变更队列**：结构方法自身顺序 `await`；History 命令由队列串行。并发调用同一树的结构方法由调用方保证顺序（与多数异步 UI 框架一致），避免重入队列死锁。

## 实施步骤

### Phase 1：Pipeline 与错误处理

- `packages/core/src/models/Pipeline.ts`
  - 新增导出 `MaybePromise<T>`、`PipelineNext<R>`。
  - `PipelineMiddleware<C, R> = (ctx: C, next: PipelineNext<R>) => MaybePromise<R | void>`。
  - `async run<C, R>(name, ctx, terminal: () => MaybePromise<R>): Promise<R>`；空管道直接 `return terminal()`；游标检测在 `await` 之前，保证重复 `next()` 立即 reject。
- `packages/core/src/internals.ts` 增加 `reportError(error)`（`console.error`）；`packages/core/src/exports.ts` 导出它，供 react/examples 使用。
- `packages/react/src/plugins/types.ts` 的 `IDesignerPipeline.run` 改为 `Promise<R>`，Provider 透传。

### Phase 2：core 模型异步化

- `packages/core/src/models/TreeNode.ts`
  - 构造函数 `this.from(node)` → `this.applyNode(node)`（同步，不派发事件、不触发中间件）。
  - `triggerMutation<T>` → `Promise<T>`；terminal 内 `context.result = await operation.dispatch(...)`，`executed` 为真才 `takeSnapshot`。
  - 结构方法 `prepend/append/insertAfter/insertBefore/insertChildren/setChildren/wrap/setProps/remove/from` → Promise；terminal 中 `await resetNodesParent`，再写 `event.data.source`、更新 children。
  - 模块级 `resetNodesParent`/`resetParent` 改 async，用 `for...of` 顺序 `await node.clone(parent)`，保持节点顺序。
  - `clone` async：先构造 newNode，再顺序 `await child.clone(newNode)`，最后 `await resetNodesParent` 并 `await triggerMutation`。
  - `serialize` async（root 走 serialize 管道）；新增 `serializeSync()` 复用私有 `serializeNode()`。
  - static `remove/clone` async，循环内 `await`，`insertPoint.next` 必须在 `await insertAfter` 之后再读。
  - `filterDroppable` async，顺序 `await node.clone(...)`；`resetNodesParent` 实例方法同步改 async。
  - `operation.dispatch` 的 callback 允许返回 Promise；`triggerMutation` await 它，其他调用方保持同步语义。
- `packages/core/src/models/Operation.ts`
  - `from/serialize` async；新增 `serializeSync()`。
  - `snapshot` 的 idle 回调改为 `void history.push(type).catch(reportError)`；新增 `cancelSnapshot()`。
- `packages/core/src/models/Workspace.ts`
  - `serialize/from` async；新增 `serializeSync()`；History 构造传入 `cancelSnapshot` 回调。
- `packages/core/src/models/History.ts`
  - `ISerializable` 改为 `{ from(): MaybePromise<void>; serialize(): MaybePromise<any>; serializeSync(): any }`。
  - 构造函数用 `serializeSync()` 同步 seed（`history.length === 1` 保持），并同步调用 `onPush`。
  - 新增私有 `tail` 队列；`push/undo/redo/goTo` 返回 `Promise<void>`，任务内重新检查 `allow*`/`locking`。
  - undo/redo/goTo 开始前调用 `props.cancelSnapshot?.()`；`locking = true` → `await context.from` → `finally locking = false` → 更新 `current` → 回调。
- `packages/core/src/models/Engine.ts`：`setCurrentTree` async。
- `packages/core/src/models/Workbench.ts`：`switchWorkspace` 返回 `Promise<Workspace | undefined>`，`setWorkbenchType` 返回 `Promise<void>`；`addWorkspace/ensureWorkspace/removeWorkspace` 保持同步。

### Phase 3：入口适配

- `packages/core/src/models/Shortcut.ts`
  - 匹配逻辑保持同步（`match/matched` 返回 boolean），handler 类型改为 `MaybePromise<void>`；命中后 `void pipeline.run(...).catch(reportError)`（无管道时直接调用）。
  - `Keyboard` 不改，`preventDefault` 时序保持同步。
- `packages/core/src/effects/useDragDropEffect.ts`
  - DragStop 订阅改为异步 IIFE + `catch(reportError)`；`drop` terminal async，先 `await filterDroppable` 再 `await` 结构方法并 `batchSafeSelect`；`finally` 中 `moveHelper.dragEnd()` 与 `cursor.setStyle('')` 仍执行。
- `packages/core/src/shortcuts/NodeMutation.ts`、`UndoRedo.ts`：handler 改 async，`await TreeNode.remove/clone`、`await history.undo/redo` 后再 `hover.clear()`。

### Phase 4：React / examples

- `packages/react/src/panels/ViewPanel.tsx`：`void tree.from(payload).then(() => tree.takeSnapshot()).catch(reportError)`。
- `packages/react/src/widgets/HistoryWidget/index.tsx`：`void history.goTo(index).catch(reportError)`。
- `packages/react/src/widgets/AuxToolWidget/Helpers.tsx`、`examples/react/src/plugins/aux-tools.tsx`：`void TreeNodeModel.clone/remove(...).catch(reportError)`。
- `examples/react/src/plugins/view-tools.tsx`、`screen-tools.tsx`：`void workbench.setWorkbenchType(...)`、`void history.undo/redo()`。
- `examples/react/src/App.tsx`：JSONTREE/MARKUP 展示改用 `tree.serializeSync()`。
- 文档代码块：`docs/guide/core-models.md`、`docs/guide/getting-started.md` 中的 serialize/from 改为 await 或 serializeSync。

### Phase 5：测试迁移与新增

- 受影响 spec：`Pipeline`、`TreeNode`、`History`、`Workspace`、`Operation`、`Engine`、`shortcuts`、`useDragDropEffect`。统一模式：`it` 改 async；调用前 `await`；返回值断言用 `await expect(...).resolves`；异常用 `await expect(...).rejects`；History mock context 增加 `serializeSync`。
- 新增用例：
  - 异步中间件前后置顺序（带 delay）。
  - 空管道仍返回 Promise；重复 `next()` rejects。
  - `node.mutation` 异步否决不产生快照；异步改写 `event.data.source`。
  - 异步 serialize 中间件只执行一次并改写结果。
  - `Promise.all([undo(), undo()])` 顺序执行两步撤销；undo 期间 push 被丢弃。
  - `Promise.all([append(a), append(b)])` 两个节点都保留。
  - 构造阶段不触发 node.mutation 中间件，初始 history 长度为 1（同步 seed）。
  - 异步快捷键 handler rejection 被 `reportError` 捕获（spy console.error）。

## Breaking changes

`Pipeline.run/next` 返回 Promise；TreeNode 全部结构方法、`remove/clone/from/serialize/triggerMutation/filterDroppable/resetNodesParent/wrap/setProps`；`History.push/undo/redo/goTo`；`Operation.from/serialize`；`Workspace.from/serialize`；`Engine.setCurrentTree`；`Workbench.switchWorkspace/setWorkbenchType`；`Shortcut` handler 返回值；`ISerializable` 新增 `serializeSync`；`IDesignerPipeline.run`。

## 关键文件

- packages/core/src/models/Pipeline.ts
- packages/core/src/models/TreeNode.ts
- packages/core/src/models/Operation.ts
- packages/core/src/models/Workspace.ts
- packages/core/src/models/History.ts
- packages/core/src/models/Engine.ts
- packages/core/src/models/Workbench.ts
- packages/core/src/models/Shortcut.ts
- packages/core/src/effects/useDragDropEffect.ts
- packages/react/src/panels/ViewPanel.tsx
- examples/react/src/App.tsx

## 验证

1. `pnpm --filter @formvk/designable-core exec tsc --noEmit`、react 包 tsc。
2. `pnpm exec vitest run packages/core/src`（重点 Pipeline/TreeNode/History/Workspace/Operation/shortcuts/effects）。
3. `pnpm check`（lint、format、test、build、docs:build）。
4. 浏览器回归：资源拖入、拖拽排序、克隆/删除、Cmd+Z/Cmd+Shift+Z、历史列表连续点击、JSONTREE/MARKUP、DESIGNABLE/PREVIEW 切换，确认无未处理 rejection。
5. 参考子仓库 `designable/` 零改动。
