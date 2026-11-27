# core API

`@formvk/designable-core` 的公开 API。签名与源码一致。标注「未从包入口导出」的成员可通过实例访问，但类型需要从
模块路径导入。

## 工厂与工具

```ts
createDesigner(props?: Partial<IEngineProps<Engine>>): Engine
reportError(error: unknown): void

createBehavior(...behaviors: Array<IBehaviorCreator | IBehaviorCreator[]>): IBehavior[]
createResource(type: SourceType | IResourceCreator, ...sources: IResourceCreator[]): IResource[]
createLocales(...packages: IDesignerLocales[]): IDesignerLocales

isBehaviorHost(value: any): value is IBehaviorHost
isBehaviorList(value: any): value is IBehavior[]
isBehavior(value: any): value is IBehavior
isResourceHost(value: any): value is IResourceHost
isResourceList(value: any): value is IResource[]
isResource(value: any): value is IResource
```

`createDesigner` 在 `new Engine(props)` 之上注册默认 drivers、effects 与 shortcuts。

## Engine

```ts
class Engine extends Event {
  id: string
  props: IEngineProps<Engine>
  cursor: Cursor
  workbench: Workbench
  keyboard: Keyboard
  screen: Screen
  registry: Registry
  pipeline: Pipeline

  constructor(props: Partial<IEngineProps<Engine>>)
  init(): void
  mount(): void
  unmount(): void

  setCurrentTree(tree?: ITreeNode): Promise<void>
  getCurrentTree(): TreeNode | undefined
  getAllSelectedNodes(): TreeNode[]
  findNodeById(id: string, workspace?: Workspace): TreeNode | undefined
  findMovingNodes(): TreeNode[]
  createNode(node: ITreeNode, parent?: TreeNode): TreeNode
}
```

`Engine.defaultProps` 的关键字段：

| 字段                            | 默认值                                   |
| ------------------------------- | ---------------------------------------- |
| `rootComponentName`             | `'Root'`                                 |
| `defaultScreenType`             | `ScreenType.PC`                          |
| `nodeIdAttrName`                | `'data-designer-node-id'`                |
| `sourceIdAttrName`              | `'data-designer-source-id'`              |
| `contentEditableAttrName`       | `'data-content-editable'`                |
| `contentEditableNodeIdAttrName` | `'data-content-editable-node-id'`        |
| `clickStopPropagationAttrName`  | `'data-click-stop-propagation'`          |
| `outlineNodeIdAttrName`         | `'data-designer-outline-node-id'`        |
| `nodeSelectionIdAttrName`       | `'data-designer-node-helpers-id'`        |
| `nodeDragHandlerAttrName`       | `'data-designer-node-drag-handler'`      |
| `nodeResizeHandlerAttrName`     | `'data-designer-node-resize-handler'`    |
| `nodeTranslateAttrName`         | `'data-designer-node-translate-handler'` |
| `screenResizeHandlerAttrName`   | `'data-designer-screen-resize-handler'`  |

`IEngineProps` 还包含 `shortcuts`、`effects`、`drivers`、`defaultComponentTree`、`language`、`fallbackLanguage`、
`locales`、`icons`。

## Workbench

```ts
class Workbench {
  @shallow accessor workspaces: Workspace[]
  @shallowRef accessor currentWorkspace: Workspace | undefined
  @shallowRef accessor activeWorkspace: Workspace | undefined
  @shallowRef accessor type: WorkbenchTypes
  engine: Engine

  constructor(engine: Engine)

  switchWorkspace(id: string): Promise<Workspace | undefined>
  setActiveWorkspace(workspace?: Workspace): Workspace | undefined
  setWorkbenchType(type: WorkbenchTypes): Promise<void>
  addWorkspace(props: IWorkspaceProps): Workspace
  removeWorkspace(id: string): void
  ensureWorkspace(props: IWorkspaceProps): Workspace | undefined

  findWorkspaceById(id?: string): Workspace | undefined
  findWorkspaceIndexById(id: string): number
  mapWorkspace<T>(callbackFn: (value: Workspace, index: number) => T): T[]
  eachWorkspace<T>(callbackFn: (value: Workspace, index: number) => T): void
  getEventContext(): IEngineContext
}
```

`switchWorkspace` 与 `setWorkbenchType` 共用串行队列，按调用顺序落地。`type` 取值见
[`WorkbenchTypes`](#类型)。

## Workspace

```ts
class Workspace {
  id: string
  title: string
  description: string
  engine: Engine
  viewport: Viewport
  outline: Viewport
  operation: Operation
  history: History<Workspace>
  props: IWorkspaceProps

  constructor(engine: Engine, props: IWorkspaceProps)

  attachEvents(container: EventContainer, contentWindow: Window): void
  detachEvents(container: EventContainer): void
  dispatch(event: ICustomEvent): boolean
  getEventContext(): IEngineContext

  serialize(): Promise<IWorkspace>
  serializeSync(): IWorkspace
  from(workspace?: IWorkspace): Promise<void>
}
```

```ts
interface IWorkspaceProps {
  id?: string
  title: string
  description: string
  contentWindow: Window
  viewportElement: HTMLElement
}
```

## Operation

```ts
class Operation {
  workspace: Workspace
  engine: Engine
  tree: TreeNode
  nodes: Map<string, TreeNode>
  selection: Selection
  hover: Hover
  moveHelper: MoveHelper
  transformHelper: TransformHelper
  requests: { snapshot: number }

  constructor(workspace: Workspace)

  dispatch(event: ICustomEvent, callback?: () => MaybePromise<any>): void | MaybePromise<any>
  runMutation<T>(task: () => MaybePromise<T>): Promise<T>
  snapshot(type?: string): void
  cancelSnapshot(): void

  from(operation?: IOperation): Promise<void>
  serialize(): Promise<IOperation>
  serializeSync(): IOperation
}
```

`runMutation` 为不可重入的互斥队列，语义见[异步变更与历史](/guide/explanation/async-mutations)。

## TreeNode

属性与派生值：

```ts
class TreeNode {
  parent: TreeNode
  root: TreeNode
  id: string
  depth: number
  sourceName: string
  @shallowRef accessor hidden: boolean
  @shallowRef accessor componentName: string
  @reactive accessor props: Record<string | number | symbol, any>
  @shallow accessor children: TreeNode[]

  constructor(node: ITreeNode, parent?: TreeNode)

  @computed get designerProps(): IDesignerProps
  @computed get designerLocales(): IDesignerLocales

  get previous(): TreeNode | undefined
  get next(): TreeNode | undefined
  get siblings(): TreeNode[]
  get index(): number
  get descendants(): TreeNode[]
  get isRoot(): boolean
  get isSourceNode(): boolean
  get firstChild(): TreeNode | undefined
  get lastChild(): TreeNode | undefined
  get operation(): Operation | undefined
  get viewport(): Viewport | undefined
  get outline(): Viewport | undefined
  get moveLayout(): string | undefined
}
```

查询与能力判定：

```ts
getElement(area?: 'viewport' | 'outline'): HTMLElement | undefined
getValidElement(area?: 'viewport' | 'outline'): Element | undefined
getElementRect(area?): Rect | undefined
getValidElementRect(area?): Rect | undefined
getElementOffsetRect(area?): Rect | undefined
getValidElementOffsetRect(area?): Rect | undefined

getPrevious(step?: number): TreeNode
getAfter(step?: number): TreeNode
getSibling(index?: number): TreeNode
getParents(node?: TreeNode): TreeNode[]
getParentByDepth(depth?: number): TreeNode | undefined
getMessage(token: string): any

isMyAncestor(node: TreeNode): boolean
isMyParent(node: TreeNode): boolean
isMyParents(node: TreeNode): boolean
isMyChild(node: TreeNode): boolean
isMyChildren(node: TreeNode): boolean

find(finder: INodeFinder): TreeNode | undefined
findAll(finder: INodeFinder): TreeNode[]
findById(id?: string): TreeNode | undefined
contains(...nodes: TreeNode[]): boolean
distanceTo(node: TreeNode): number
crossSiblings(node: TreeNode): TreeNode[]

allowSibling(nodes: TreeNode[]): boolean | undefined
allowDrop(parent: TreeNode): boolean
allowAppend(nodes: TreeNode[]): boolean
allowClone(): boolean
allowDrag(): boolean
allowResize(): false | Array<'x' | 'y'>
allowRotate(): void
allowRound(): void
allowScale(): void
allowTranslate(): boolean
allowDelete(): boolean
```

变更方法（均返回 Promise）：

```ts
setProps(props?: any): Promise<any>
setComponentName(componentName: string): void
prepend(...nodes: TreeNode[]): Promise<TreeNode[]>
append(...nodes: TreeNode[]): Promise<TreeNode[]>
wrap(wrapper: TreeNode): Promise<TreeNode | undefined>
insertAfter(...nodes: TreeNode[]): Promise<TreeNode[]>
insertBefore(...nodes: TreeNode[]): Promise<TreeNode[]>
insertChildren(start: number, ...nodes: TreeNode[]): Promise<TreeNode[]>
setChildren(...nodes: TreeNode[]): Promise<TreeNode[]>
remove(): Promise<void>
clone(parent?: TreeNode): Promise<TreeNode>
from(node?: ITreeNode): Promise<void>
resetNodesParent(nodes: TreeNode[], parent: TreeNode): Promise<TreeNode[]>

takeSnapshot(type?: string): void
triggerMutation<T>(event: any, callback?: () => MaybePromise<T>, defaults?: T): Promise<T>
serialize(): Promise<ITreeNode>
serializeSync(): ITreeNode
```

静态方法：

```ts
TreeNode.create(node: ITreeNode, parent?: TreeNode): TreeNode
TreeNode.findById(id: string): TreeNode | undefined
TreeNode.remove(nodes?: TreeNode[]): Promise<void>
TreeNode.clone(nodes?: TreeNode[]): Promise<void>
TreeNode.sort(nodes?: TreeNode[]): TreeNode[]
TreeNode.filterResizable(nodes?: TreeNode[]): TreeNode[]
TreeNode.filterRotatable(nodes?: TreeNode[]): TreeNode[]
TreeNode.filterScalable(nodes?: TreeNode[]): TreeNode[]
TreeNode.filterRoundable(nodes?: TreeNode[]): TreeNode[]
TreeNode.filterTranslatable(nodes?: TreeNode[]): TreeNode[]
TreeNode.filterDraggable(nodes?: TreeNode[]): TreeNode[]
TreeNode.filterDroppable(nodes?: TreeNode[], parent: TreeNode): Promise<TreeNode[]>
```

## Selection

```ts
class Selection {
  operation: Operation
  @reactive accessor selected: string[]

  constructor(props: ISelection)

  select(id: string | TreeNode): void
  safeSelect(id: string | TreeNode): void
  batchSelect(ids: string[] | TreeNode[]): void
  batchSafeSelect(ids: string[] | TreeNode[]): void
  add(...ids: string[] | TreeNode[]): void
  crossAddTo(node: TreeNode): void
  remove(...ids: string[] | TreeNode[]): void
  has(...ids: string[] | TreeNode[]): boolean
  clear(): void

  get selectedNodes(): TreeNode[]
  get first(): string | undefined
  get last(): string | undefined
  get length(): number
}
```

`safeSelect` / `batchSafeSelect` 在变更后触发选择事件；`select` / `batchSelect` 只修改状态。

## History

```ts
class History<T extends ISerializable = any> {
  @shallowRef accessor current: number
  @shallow accessor history: HistoryItem<T>[]
  maxSize: number // 默认 100
  locking: boolean

  constructor(context: T, props?: IHistoryProps<HistoryItem<T>>)

  list(): HistoryItem<T>[]
  push(type?: string): Promise<void>
  undo(): Promise<void>
  redo(): Promise<void>
  goTo(index: number): Promise<void>
  clear(): void

  get allowUndo(): boolean
  get allowRedo(): boolean
}
```

```ts
interface HistoryItem<T> {
  type?: string
  data?: T
}
```

`locking` 为真时 `push` 直接返回；历史命令串行执行。

## Pipeline

```ts
class Pipeline {
  use<C = any, R = any>(name: string, middleware: PipelineMiddleware<C, R>, options?: IPipelineUseOptions): () => void
  has(name: string): boolean
  run<C = any, R = any>(name: string, context: C, terminal: () => MaybePromise<R>): Promise<R>
  clear(name?: string): void
}

type MaybePromise<T> = T | Promise<T>
type PipelineNext<R> = () => Promise<R>
type PipelineMiddleware<C = any, R = any> = (context: C, next: PipelineNext<R>) => MaybePromise<R | void>

interface IPipelineUseOptions {
  id?: string
  order?: number
}
```

内置管道：

```ts
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

各管道的 context 字段见[插件 API](/guide/reference/plugin-api#管道)。

## Registry

```ts
class Registry {
  i18n: I18n
  behaviors: IDesignerBehaviorStore
  icons: IDesignerIconsStore

  constructor(props?: IRegistryProps)

  setDesignerLanguage(lang: string): void
  getDesignerLanguage(): string
  getDesignerMessage(token: string, locales?: IDesignerLocales): any

  registerDesignerLocales(...packages: IDesignerLocales[]): void
  setDesignerBehaviors(behaviors: IBehaviorLike[]): void
  getDesignerBehaviors(node: TreeNode): IBehavior[]
  registerDesignerBehaviors(...packages: IDesignerBehaviors[]): void

  registerDesignerIcons(map: IDesignerIcons): void
  getDesignerIcon(name: string): any
}

interface IRegistryProps {
  language?: string
  fallbackLanguage?: string
  locales?: IDesignerLocales
  icons?: IDesignerIcons
}
```

## Cursor

```ts
class Cursor {
  @shallowRef accessor type: CursorType | string
  @shallowRef accessor dragType: CursorDragType | string
  @shallowRef accessor status: CursorStatus
  @shallowRef accessor position: ICursorPosition
  @shallowRef accessor dragStartPosition: ICursorPosition | undefined
  @shallowRef accessor dragEndPosition: ICursorPosition | undefined
  @shallowRef accessor dragAtomDelta: ICursorPosition
  @shallowRef accessor dragStartToCurrentDelta: ICursorPosition
  @shallowRef accessor dragStartToEndDelta: ICursorPosition
  @shallowRef accessor view: Window

  constructor(engine: Engine)

  get speed(): number
  setStatus(status: CursorStatus): void
  setType(type: CursorType | string): void
  setDragType(type: CursorDragType | string): void
  setStyle(style?: string): void
  setPosition(position: ICursorPosition): void
  setDragStartPosition(position?: ICursorPosition | null): void
  setDragEndPosition(position?: ICursorPosition): void
}

interface ICursorPosition {
  pageX?: number
  pageY?: number
  clientX?: number
  clientY?: number
  topPageX?: number
  topPageY?: number
  topClientX?: number
  topClientY?: number
}
```

## Screen

```ts
class Screen {
  @shallowRef accessor type: ScreenType
  @shallowRef accessor scale: number
  @shallowRef accessor width: number | string
  @shallowRef accessor height: number | string
  @shallowRef accessor background: string
  @shallowRef accessor flip: boolean
  @shallowRef accessor status: ScreenStatus

  constructor(engine: Engine)

  setStatus(status: ScreenStatus): void
  setType(type: ScreenType): void
  setScale(scale: number): void
  setSize(width?: number | string, height?: number | string): void
  resetSize(): void
  setBackground(background: string): void
  setFlip(flip: boolean): void
}
```

## Keyboard 与 Shortcut

```ts
class Keyboard {
  shortcuts: Shortcut[]
  @shallow accessor sequence: KeyCode[]
  @shallowRef accessor keyDown: KeyCode | undefined

  constructor(engine: Engine)

  matchCodes(context: IEngineContext): boolean
  preventCodes(): boolean
  includes(key: KeyCode): boolean
  excludes(key: KeyCode): void
  addKeyCode(key: KeyCode): void
  removeKeyCode(key: KeyCode): void
  isModifier(code: KeyCode): boolean
  isKeyDown(code: KeyCode): boolean
  handleModifiers(event: AbstractKeyboardEvent): void
  handleKeyboard(event: AbstractKeyboardEvent, context: IEngineContext): void
  requestClean(duration?: number): void
}

class Shortcut {
  codes: KeyCode[][]
  handler?: (context: IEngineContext) => MaybePromise<void>
  matcher?: (codes: KeyCode[]) => boolean

  constructor(props: IShortcutProps)

  match(codes: KeyCode[], context: IEngineContext): boolean
  matched(matched: boolean, context: IEngineContext): boolean
  preventCodes(codes: KeyCode[]): boolean
  parseCodes(codes: Array<KeyCode | KeyCode[]>): KeyCode[][]
}
```

`IEngineContext`：

```ts
type IEngineContext = {
  workspace?: Workspace
  workbench: Workbench
  engine: Engine
  viewport?: Viewport
}
```

## Viewport

```ts
class Viewport {
  @shallowRef accessor contentWindow: Window
  @shallowRef accessor viewportElement: HTMLElement
  @shallowRef accessor scrollX: number
  @shallowRef accessor scrollY: number
  @shallowRef accessor width: number
  @shallowRef accessor height: number

  constructor(props: IViewportProps)

  get rect(): DOMRect | undefined
  get innerRect(): Rect
  get offsetX(): number
  get offsetY(): number
  get scale(): number
  get isMaster(): boolean
  get isIframe(): boolean
  get scrollContainer(): Window | HTMLElement
  get viewportRoot(): HTMLElement | undefined
  get isScrollLeft(): boolean
  get isScrollTop(): boolean
  get isScrollRight(): boolean | undefined
  get isScrollBottom(): boolean | undefined
  get dragScrollXDelta(): number
  get dragScrollYDelta(): number

  onMount(element: HTMLElement, contentWindow: Window): void
  onUnmount(): void
  attachEvents(): void
  detachEvents(): void
  cacheElements(): void
  clearCache(): void
  digestViewport(): void

  getCurrentData(): IViewportData
  takeDragStartSnapshot(): void

  elementFromPoint(point: IPoint): Element | null | undefined
  matchViewport(target: EventTarget | Element | Window | Document): boolean
  containsElement(element: EventTarget | Element): boolean
  findElementById(id?: string): HTMLElement | undefined
  findElementsById(id: string): HTMLElement[]
  getElementRect(element: Element): Rect
  getElementRectById(id: string): Rect | undefined
  getElementOffsetRect(element: Element): Rect | undefined
  getElementOffsetRectById(id: string): Rect | undefined
  getOffsetPoint(topPoint: IPoint): { x: number; y: number }
  getValidNodeElement(node: TreeNode): Element
  getValidNodeRect(node?: TreeNode): Rect | undefined
  getValidNodeOffsetRect(node?: TreeNode): Rect | undefined
  getValidNodeLayout(node?: TreeNode): 'horizontal' | 'vertical'
  getChildrenRect(node: TreeNode): Rect | undefined
  getChildrenOffsetRect(node: TreeNode): Rect | undefined
  isPointInViewport(point: IPoint, sensitive?: boolean): boolean
  isRectInViewport(rect: IRect): boolean
  isPointInViewportArea(point: IPoint, sensitive?: boolean): boolean
  isOffsetPointInViewport(point: IPoint, sensitive?: boolean): boolean
  isOffsetRectInViewport(rect: IRect): boolean
}

interface IViewportProps {
  engine: Engine
  workspace: Workspace
  viewportElement: HTMLElement
  contentWindow: Window
  nodeIdAttrName: string
  moveSensitive?: boolean
  moveInsertionType?: 'all' | 'inline' | 'block'
}
```

## MoveHelper

```ts
class MoveHelper {
  @shallowRef accessor dragNodes: TreeNode[]
  @shallowRef accessor touchNode: TreeNode | undefined
  @shallowRef accessor closestNode: TreeNode | undefined
  @shallowRef accessor viewportClosestRect: Rect | undefined
  @shallowRef accessor outlineClosestRect: Rect | undefined
  @shallowRef accessor viewportClosestOffsetRect: Rect | undefined
  @shallowRef accessor outlineClosestOffsetRect: Rect | undefined
  @shallowRef accessor viewportClosestDirection: ClosestPosition | undefined
  @shallowRef accessor outlineClosestDirection: ClosestPosition | undefined
  @shallowRef accessor dragging: boolean

  constructor(props: IMoveHelperProps)

  get hasDragNodes(): boolean
  get closestDirection(): ClosestPosition | undefined
  getClosestLayout(viewport: Viewport): 'horizontal' | 'vertical'
  calcClosestPosition(point: IPoint, viewport: Viewport): ClosestPosition | undefined
  calcClosestNode(point: IPoint, viewport: Viewport): TreeNode | undefined
  calcClosestRect(viewport: Viewport, closestDirection?: ClosestPosition): Rect | undefined
  calcClosestOffsetRect(viewport: Viewport, closestDirection?: ClosestPosition): Rect | undefined

  dragStart(props: IMoveHelperDragStartProps): void
  dragMove(props: IMoveHelperDragMoveProps): void
  dragDrop(props: IMoveHelperDragDropProps): void
  dragEnd(): void
}
```

## 类型

```ts
type WorkbenchTypes = 'DESIGNABLE' | 'PREVIEW' | 'JSONTREE' | 'MARKUP' | (string & {})

type SourceType = 'Inputs' | 'Layouts' | 'Arrays' | 'Displays' | 'Others' | (string & {})

interface ITreeNode {
  componentName: string
  sourceName?: string
  operation?: Operation
  hidden?: boolean
  isSourceNode?: boolean
  id?: string
  props: Record<string | number | symbol, any>
  children?: ITreeNode[]
}

interface IOperation {
  tree?: ITreeNode
  selected?: string[]
}

interface ISerializable {
  from(json: any): MaybePromise<void>
  serialize(): MaybePromise<any>
  serializeSync(): any
}
```

`IDesignerProps`、`IBehavior`、`IResource` 等物料类型见[自定义物料](/guide/how-to/custom-components)。
游标、屏幕、拖拽方向常量见[core 事件与常量](/guide/reference/core-events)。

## 未从包入口导出的成员

- `EventDriver`：位于 `@formvk/designable-shared`，通过 `engine.attachEvents` / `workspace.attachEvents` 使用。
- `Hover`、`TransformHelper`、`SnapLine`、`SpaceBlock`：通过 `operation.hover`、`operation.transformHelper` 访问。
- `internals` 中的 `lowerSnake`、`mergeLocales`、`getBrowserLanguage`：从 `@formvk/designable-i18n` 导入。
