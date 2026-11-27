# 自定义物料

本文解决一个问题：把已有 React 组件接入设计器，使它出现在资源面板、可拖入画布、可选中并具备缩放等编辑能力。

物料由三部分组成：

| 部分     | 作用                                       |
| -------- | ------------------------------------------ |
| 组件     | 画布中的真实渲染，需要透传引擎注入的 props |
| Behavior | 设计器能力（拖拽、缩放、文案、默认属性）   |
| Resource | 资源面板中的条目与拖入时的初始属性         |

## 步骤 1：编写组件

组件必须把收到的 props 透传到根 DOM，设计器依赖其中的 `data-designer-node-id` 做点击命中：

```tsx
const Input = (props: Record<string, any>) => <input {...props} />
```

如果组件有内部结构，仍然要把 props 展开在最外层元素上：

```tsx
const Field = ({ label, children, ...rest }: Record<string, any>) => (
  <label {...rest}>
    <span>{label}</span>
    {children}
  </label>
)
```

## 步骤 2：定义 Behavior

```ts
import { createBehavior } from '@formvk/designable-core'

const InputBehavior = createBehavior({
  name: 'Input',
  selector: 'Input',
  designerProps: {
    resizable: { width: true, height: true },
  },
  designerLocales: {
    'zh-CN': { title: '输入框' },
    'en-US': { title: 'Input' },
  },
})
```

- `name`：Behavior 的唯一名称。
- `selector`：字符串会匹配 `node.componentName`；也可以传 `(node) => boolean` 做动态匹配。
- `designerLocales.title` 决定节点标题（`node.getMessage('title')`）。

## 步骤 3：定义 Resource

```ts
import { createResource } from '@formvk/designable-core'

export const inputResource = createResource('Displays', {
  title: { 'zh-CN': '输入框', 'en-US': 'Input' },
  icon: 'code',
  elements: [{ componentName: 'Input', props: {} }],
})
```

`createResource(type, ...items)` 的第一个参数是资源分组名。`elements` 中每一行都会被拖入画布生成一个节点。

## 步骤 4：注册到画布

```tsx
import type { IDesignerComponents } from '@formvk/designable-react'

import { Input } from './Input'

export const components: IDesignerComponents = {
  Input: Object.assign(Input, { Behavior: InputBehavior }),
}
```

把 `components` 传给 `ComponentTreeWidget`，把 `[inputResource]` 传给 `ResourceListWidget`：

```tsx
<ResourceListWidget sources={[inputResource]} />
<ViewPanel type="DESIGNABLE">{() => <ComponentTreeWidget components={components} />}</ViewPanel>
```

> `ResourceListWidget` 的 `sources` 接受资源数组，`createResource(...)` 的返回值可以直接作为其中一项。

## 常见能力

### 容器与嵌套

```ts
designerProps: {
  droppable: true,
  allowAppend: (target, sources) => (sources?.length || 0) <= 6,
}
```

`droppable` 允许节点接收子节点；`allowAppend` / `allowDrop` / `allowSiblings` 可进一步限制。

### 默认属性与运行时属性

```ts
designerProps: {
  defaultProps: { label: '姓名' },
  getComponentProps: node => ({
    disabled: node.props.required === true,
  }),
}
```

`defaultProps` 在节点创建时作为初始 props；`getComponentProps` 在每次渲染时合并，适合派生展示属性。

### 原地编辑文本

在需要编辑的元素上声明 `data-content-editable`，值是要写入的 props 键：

```tsx
const Text = ({ title, ...rest }: Record<string, any>) => (
  <span {...rest} data-content-editable="title">
    {title}
  </span>
)
```

双击元素后修改文本，失焦时会写入 `node.props.title`。属性名由引擎参数 `contentEditableAttrName` 决定，
默认即 `data-content-editable`。

### 禁止某些操作

```ts
designerProps: {
  draggable: false,
  deletable: false,
  cloneable: false,
}
```

对应能力默认均为 `true`。

### 不通过 components 注册

如果物料映射由其他方式提供，可以只注册 Behavior：

```ts
engine.registry.registerDesignerBehaviors({
  myComponents: { Behavior: InputBehavior },
})
```

## 验证

1. 资源面板出现条目。
2. 拖入画布后生成节点，选中框出现。
3. 拖动缩放手柄调整尺寸。
4. 双击文本可原地编辑（若声明了 `data-content-editable`）。

## 注意事项

- `componentName` 必须与 `components` 映射的键一致。
- 不要用 `React.memo` 阻断引擎注入的 props；物料通常不需要 `observer`。
- Behavior 的 `name` 在注册表内应唯一，重复注册会覆盖同名的 `designerProps`。

更多设计思路见[架构](/guide/explanation/architecture)。
