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
      text: 架构与概念
      link: /guide/explanation/architecture

features:
  - title: 模型与视图解耦
    details: core 只包含引擎、工作区、组件树、选区、历史与事件，可搭配 React 或任意渲染层。
  - title: 装饰器驱动响应式
    details: 模型字段通过 @shallowRef / @shallow / @reactive / @computed / @action 声明，基于 @formvk/reactive 做细粒度依赖追踪。
  - title: React 视图层
    details: '@formvk/designable-react 提供画布、面板、hooks 与插件插槽，组件通过 observer 精确订阅。'
  - title: 异步且串行的编辑链路
    details: 结构变更与历史命令均为 Promise；同一工作区的变更经互斥队列串行，历史恢复不会与编辑分叉。
  - title: 可扩展的管道
    details: nodeMutation / command / dragDrop / serialize / deserialize / shortcut / workbench 七个管道支持异步中间件。
  - title: 纯 ESM 产物
    details: Vite 8（rolldown / oxc）构建，dist/index.js 与逐文件 d.ts。
---
