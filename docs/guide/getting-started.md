# 快速开始

## 环境要求

- Node.js >= 22.12
- pnpm 12

## 安装

```bash
pnpm add @formvk/designable-core @formvk/designable-shared
```

`@formvk/designable-core` 依赖 `@formvk/reactive` 与 `@formvk/designable-shared`，并以 `@formvk/path`、
`@formvk/schema` 作为 peer 依赖；`@formvk/designable-shared` 提供几何计算、事件基类与惰性调度等基础能力。

## 最小示例

```ts
import { Engine } from '@formvk/designable-core'

// 1. 创建引擎（可选传入默认组件树与事件驱动）
const engine = new Engine({
  defaultComponentTree: { componentName: 'Page' },
})

// 2. 添加工作区：绑定视口 DOM 与 contentWindow（iframe 场景传 iframe.contentWindow）
const workspace = engine.workbench.addWorkspace({
  id: 'main',
  title: '主画布',
  contentWindow: window,
  viewportElement: document.querySelector('#viewport')!,
})

// 3. 加载组件树
workspace.operation.tree.from({
  componentName: 'Page',
  children: [{ componentName: 'Input', props: { label: '姓名' } }],
})

// 4. 记录历史快照，之后即可 undo / redo
workspace.history.push('init')
```

## 仓库开发

```bash
pnpm install
pnpm build       # 构建 packages/*
pnpm docs:dev    # 本地启动文档
pnpm check       # lint / format / test / build / docs 全量校验
```

构建产物位于各包的 `dist/`，入口为 `dist/index.js`，类型为逐文件输出到 `dist/*.d.ts`。
