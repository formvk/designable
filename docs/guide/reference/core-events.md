# core 事件与常量

core 的事件类都带 `type` 字符串与 `data` 字段，并携带 `context: IEngineContext`。事件通过
`workspace.dispatch(event)` 广播，可用 `engine.subscribeTo(EventClass, subscriber)` 或
`engine.subscribeWith(type, subscriber)` 订阅。

## 事件基类

以下基类未从包入口导出：

```ts
class AbstractCursorEvent {
  data: ICursorEventData
  context: IEngineContext
  constructor(data: ICursorEventOriginData)
  transformCoordinates(): void
}

class AbstractKeyboardEvent {
  data: KeyCode
  context: IEngineContext
  originEvent: KeyboardEvent
  constructor(event: KeyboardEvent)
  get ctrlKey(): boolean
  get shiftKey(): boolean
  get metaKey(): boolean
  get altkey(): boolean
  preventDefault(): void
  stopPropagation(): void
}

class AbstractMutationNodeEvent {
  data: IMutationNodeEventData
  context: IEngineContext
}

class AbstractViewportEvent {
  data: IViewportEventData
  context: IEngineContext
}

class AbstractHistoryEvent {
  data: any
  context: IEngineContext
}

class AbstractWorkspaceEvent {
  data: Workspace
  context: IEngineContext
}
```

## 鼠标与拖拽

| 类                      | `type`           | `data`   |
| ----------------------- | ---------------- | -------- |
| `MouseMoveEvent`        | `mouse:move`     | 光标位置 |
| `MouseClickEvent`       | `mouse:click`    | 光标位置 |
| `MouseDoubleClickEvent` | `mouse:dblclick` | 光标位置 |
| `DragStartEvent`        | `drag:start`     | 光标位置 |
| `DragMoveEvent`         | `drag:move`      | 光标位置 |
| `DragStopEvent`         | `drag:stop`      | 光标位置 |

`ICursorEventData` 包含 `pageX`、`pageY`、`clientX`、`clientY`、`topPageX`、`topPageY`、`topClientX`、
`topClientY`、`target`、`view` 等字段。

## 键盘

| 类             | `type`     | `data`    |
| -------------- | ---------- | --------- |
| `KeyDownEvent` | `key:down` | `KeyCode` |
| `KeyUpEvent`   | `key:up`   | `KeyCode` |

## 历史

| 类                 | `type`         | `data`   |
| ------------------ | -------------- | -------- |
| `HistoryPushEvent` | `history:push` | 快照类型 |
| `HistoryUndoEvent` | `history:undo` | 快照索引 |
| `HistoryRedoEvent` | `history:redo` | 快照索引 |
| `HistoryGotoEvent` | `history:goto` | 快照索引 |

## 结构变更

所有变更事件共享：

```ts
interface IMutationNodeEventData {
  source: TreeNode | TreeNode[]
  target: TreeNode | TreeNode[]
  originSourceParents?: TreeNode | TreeNode[]
  extra?: any
}
```

| 类                     | `type`              | 触发时机         |
| ---------------------- | ------------------- | ---------------- |
| `AppendNodeEvent`      | `append:node`       | `append`         |
| `PrependNodeEvent`     | `prepend:node`      | `prepend`        |
| `InsertBeforeEvent`    | `insert:before`     | `insertBefore`   |
| `InsertAfterEvent`     | `insert:after`      | `insertAfter`    |
| `InsertChildrenEvent`  | `insert:children`   | `insertChildren` |
| `UpdateChildrenEvent`  | `update:children`   | `setChildren`    |
| `RemoveNodeEvent`      | `remove:node`       | `remove`         |
| `UpdateNodePropsEvent` | `update:node:props` | `setProps`       |
| `WrapNodeEvent`        | `wrap:node`         | `wrap`           |
| `CloneNodeEvent`       | `clone:node`        | `clone`          |
| `DragNodeEvent`        | `drag:node`         | 拖拽节点         |
| `DropNodeEvent`        | `drop:node`         | 放置节点         |
| `HoverNodeEvent`       | `hover:node`        | 悬停节点         |
| `SelectNodeEvent`      | `select:node`       | 选中节点         |
| `UnSelectNodeEvent`    | `unselect:node`     | 取消选中         |

反序列化使用独立事件：

```ts
interface IFromNodeEventData {
  source: ITreeNode
  target: TreeNode
}

class FromNodeEvent {
  type: 'from:node'
  data: IFromNodeEventData
  context: IEngineContext
}
```

## 视口

| 类                    | `type`            | `data`                                                 |
| --------------------- | ----------------- | ------------------------------------------------------ |
| `ViewportResizeEvent` | `viewport:resize` | `width`、`height`、`innerWidth`、`innerHeight`、`view` |
| `ViewportScrollEvent` | `viewport:scroll` | `scrollX`、`scrollY`、`view`                           |

## 工作台

| 类                     | `type`             | `data`      |
| ---------------------- | ------------------ | ----------- |
| `AddWorkspaceEvent`    | `add:workspace`    | `Workspace` |
| `RemoveWorkspaceEvent` | `remove:workspace` | `Workspace` |
| `SwitchWorkspaceEvent` | `switch:workspace` | `Workspace` |

## 常量

```ts
enum CursorStatus {
  Normal = 'NORMAL',
  DragStart = 'DRAG_START',
  Dragging = 'DRAGGING',
  DragStop = 'DRAG_STOP',
}

enum CursorDragType {
  Move = 'MOVE',
  Resize = 'RESIZE',
  Rotate = 'ROTATE',
  Scale = 'SCALE',
  Translate = 'TRANSLATE',
  Round = 'ROUND',
}

enum CursorType {
  Normal = 'NORMAL',
  Selection = 'SELECTION',
  Sketch = 'SKETCH',
}

enum ScreenType {
  PC = 'PC',
  Responsive = 'Responsive',
  Mobile = 'Mobile',
  Sketch = 'Sketch',
}

enum ScreenStatus {
  Normal = 'Normal',
  Resizing = 'Resizing',
  Zooming = 'Zooming',
}

enum ClosestPosition {
  Before = 'BEFORE',
  ForbidBefore = 'FORBID_BEFORE',
  After = 'After',
  ForbidAfter = 'FORBID_AFTER',
  Upper = 'UPPER',
  ForbidUpper = 'FORBID_UPPER',
  Under = 'UNDER',
  ForbidUnder = 'FORBID_UNDER',
  Inner = 'INNER',
  ForbidInner = 'FORBID_INNER',
  InnerAfter = 'INNER_AFTER',
  ForbidInnerAfter = 'FORBID_INNER_AFTER',
  InnerBefore = 'INNER_BEFORE',
  ForbidInnerBefore = 'FORBID_INNER_BEFORE',
  Forbid = 'FORBID',
}
```

`KeyCode` 枚举包含修饰键、方向键、字母、数字、标点与 `F1`–`F12`，定义在 `@formvk/designable-shared`，
由 core 重新导出。`WorkbenchTypes` 为字符串联合：

```ts
type WorkbenchTypes = 'DESIGNABLE' | 'PREVIEW' | 'JSONTREE' | 'MARKUP' | (string & {})
```

## 订阅示例

```ts
import { DragStopEvent, HistoryUndoEvent } from '@formvk/designable-core'

const dispose = engine.subscribeWith([DragStopEvent, HistoryUndoEvent], event => {
  console.log(event.type)
})

dispose()
```

也可按事件类订阅并获得具体类型：

```ts
engine.subscribeTo(DragStopEvent, event => {
  console.log(event.data.pageX, event.data.pageY)
})
```
