# 架构

本文解释 Designable 为什么这样分层，以及一次交互从 DOM 事件落到模型、再回到视图的完整路径。
具体的类与方法签名见「API 参考」。

## 两层包

- `@formvk/designable-core`：模型与事件，不引用 React，也不直接操作 DOM 渲染。
- `@formvk/designable-react`：core 之上的一种渲染层，负责画布、面板与交互编排。

这样分层的目的不是“通用框架”式的抽象，而是让编辑模型可以脱离 UI 测试和复用：core 的全部测试都只依赖
模型与 DOM 事件，不渲染 React 组件。

## 模型树

```text
Engine
├── screen           屏幕类型与尺寸
├── cursor           光标位置、拖拽状态
├── keyboard         键盘状态
├── registry         Behavior、图标、UI 文案
├── pipeline         七个扩展点
└── workbench
    └── Workspace                    (currentWorkspace / activeWorkspace)
        ├── operation
        │   ├── tree                TreeNode 组件树
        │   ├── selection           选中节点
        │   ├── hover               悬停节点
        │   ├── moveHelper          拖拽落点
        │   └── transformHelper     变换与吸附
        ├── viewport                 画布坐标与命中测试
        ├── outline                  大纲坐标
        ├── history                  历史快照
        └── shortcuts                快捷键
```

`Workbench` 允许同时存在多个工作区，但同一时刻只有一个 `currentWorkspace`。`activeWorkspace` 表示当前正在交互
的工作区，通常与 `currentWorkspace` 相同。

## 为什么拆分 Workspace 与 Operation

`Operation` 描述“可保存的编辑状态”：一棵组件树加一组选中 id。它不关心 DOM，因此可以独立序列化，
History 也只依赖 `Operation` 的 `serialize` / `serializeSync` 契约。

`Workspace` 则提供交互上下文：视口 DOM、事件分发、快捷键与拖拽状态。把“可序列化状态”与“交互环境”分开，
历史恢复时只需替换 `Operation` 中的数据，不需要重建整个工作区。

## 注册表负责元信息

`Registry` 保存 Behavior、图标与 UI 文案。`TreeNode` 不存储 `designerProps`，而是在访问时按 `componentName`
从注册表解析：

```ts
registry.registerDesignerBehaviors({
  pkg: {
    Behavior: [
      {
        selector: 'Input',
        designerProps: { resizable: { width: true } },
        designerLocales: { 'zh-CN': { title: '输入框' } },
      },
    ],
  },
})
```

这样物料定义与组件树数据解耦：同一份树数据可以搭配不同的 Behavior 集合，也便于运行时注册新物料。

## 一次交互的路径

以拖入一个物料为例：

1. 浏览器触发 `mousedown` / `mousemove` / `mouseup`。
2. `EventDriver` 把原生事件包装成设计器事件。
3. `Workspace.dispatch(event)` 广播给已注册的 effects 与模型。
4. `useDragDropEffect` 计算落点，调用 `TreeNode.append()`。
5. `TreeNode.triggerMutation()` 进入 `Operation` 的互斥队列。
6. 变更经过 `nodeMutation` 管道，落地后由 `Operation.snapshot()` 写入历史。
7. 视图层中订阅了 `tree.children` 的组件由 `observer` 调度重渲染。

关键点是第 5 步：所有结构变更都必须经过同一条队列，历史恢复与用户编辑才不会互相覆盖。

## 视图层如何绑定模型

React 层不复制模型状态，只做三件事：

- 通过 Context 注入 `engine`、当前 `Workspace` 与 UI 配置（主题、语言、前缀）。
- 用 `observer` 订阅模型，模型变化时重渲染。
- 把用户操作转成模型 API 调用（`selection.select`、`history.undo`、`setWorkbenchType` 等）。

`ViewPanel` 是一个典型例子：它读取 `workbench.type`，只有与自身 `type` 匹配时才渲染 children，
因此 `DESIGNABLE`、`PREVIEW`、`JSONTREE`、`MARKUP` 可以共享同一棵组件树。

## 边界与取舍

- core 不提供组件物料，也不假设渲染框架；物料由使用方注册。
- React 层不持有编辑状态，刷新页面后只需重新 `from()` 即可恢复。
- 历史采用全量快照而非增量 patch：实现简单、状态一致，代价是快照体积随树规模增长。这一取舍在
  [异步变更与历史](/guide/explanation/async-mutations) 中展开。
