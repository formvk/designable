---
layout: home

hero:
  name: Designable
  text: 基于 Formvk 的可视化设计器引擎
  tagline: 模型层与视图层解耦，使用 Formvk 响应式内核驱动画布、节点树、选区、历史与事件系统。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 核心模型
      link: /guide/core-models

features:
  - title: Formvk 响应式内核
    details: 模型通过标准装饰器（@observable / @shallowRef / @computed / @action）声明响应式，基于 @formvk/reactive 获得细粒度依赖追踪。
  - title: 视图无关
    details: core 只包含模型与事件，可搭配 React、Vue 或任意渲染层使用。
  - title: 完整的编辑器模型
    details: Engine、Workspace、TreeNode、Selection、Viewport、History、快捷键与拖拽吸附开箱即用。
  - title: 事件驱动
    details: 统一的 EventDriver 机制覆盖鼠标、键盘、拖拽、滚动与视口尺寸变化。
  - title: 纯 ESM 产物
    details: Vite 8（rolldown / oxc）构建，dist/index.js + 独立 d.ts，天然适配现代打包器。
  - title: 可组合的工作区包
    details: '@formvk/designable-shared 提供几何、事件、惰性调度等基础设施，core 专注设计器模型。'
---
