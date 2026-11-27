import { fileURLToPath, URL } from 'node:url'

import swc from '@rollup/plugin-swc'
import { withFilter } from 'vite'
import { defineConfig } from 'vitepress'

// GitHub Pages 项目站点部署在 /designable/ 子路径下，CI 通过 DOCS_BASE 注入；
// 本地开发与预览未设置该变量时回退到根路径
const docsBase =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.DOCS_BASE ?? '/'

export default defineConfig({
  title: 'Designable',
  description: '基于 Formvk 响应式内核的可视化设计器引擎',
  lang: 'zh-CN',
  base: docsBase,
  vite: {
    oxc: {
      jsx: {
        runtime: 'automatic',
        importSource: 'react',
      },
    },
    plugins: [
      // 文档直接消费 packages/*/src，需要先把标准装饰器降级为可执行代码
      withFilter(
        swc({
          swc: {
            jsc: {
              parser: { syntax: 'typescript', decorators: true },
              transform: {
                legacyDecorator: false,
                decoratorVersion: '2023-11',
              },
            },
          },
        }),
        { transform: { id: /\.(m|c)?[jt]sx?$/, code: /^\s*@[\w$.]+/m } }
      ),
    ],
    resolve: {
      alias: [
        // 文档与 playground 直接消费 workspace 源码，docs:dev / docs:build 不依赖预先构建的 dist
        {
          find: /^@formvk\/designable-core$/,
          replacement: fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
        },
        {
          find: /^@formvk\/designable-i18n$/,
          replacement: fileURLToPath(new URL('../../packages/i18n/src/index.ts', import.meta.url)),
        },
        {
          find: /^@formvk\/designable-react$/,
          replacement: fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url)),
        },
        {
          find: /^@formvk\/designable-react\/style\.less$/,
          replacement: fileURLToPath(new URL('../../packages/react/src/styles/index.less', import.meta.url)),
        },
        {
          find: /^@formvk\/designable-react\/theme\.less$/,
          replacement: fileURLToPath(new URL('../../packages/react/src/styles/theme.less', import.meta.url)),
        },
        {
          find: /^@formvk\/designable-react-icons$/,
          replacement: fileURLToPath(new URL('../../packages/react-icons/src/index.ts', import.meta.url)),
        },
        {
          find: /^@formvk\/designable-shared$/,
          replacement: fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
        },
      ],
    },
  },
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '概念', link: '/guide/explanation/architecture' },
      { text: '操作指南', link: '/guide/how-to/custom-components' },
      { text: 'API 参考', link: '/guide/reference/core-api' },
      { text: 'Playground', link: '/playground/react' },
      { text: '发布', link: '/guide/release' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [{ text: '快速开始', link: '/guide/getting-started' }],
        },
        {
          text: '概念',
          items: [
            { text: '架构', link: '/guide/explanation/architecture' },
            { text: '响应式模型', link: '/guide/explanation/reactivity' },
            { text: '异步变更与历史', link: '/guide/explanation/async-mutations' },
          ],
        },
        {
          text: '操作指南',
          items: [
            { text: '自定义物料', link: '/guide/how-to/custom-components' },
            { text: '国际化', link: '/guide/how-to/i18n' },
            { text: '插件与插槽', link: '/guide/how-to/plugins' },
            { text: '排障', link: '/guide/how-to/troubleshooting' },
          ],
        },
        {
          text: 'API 参考',
          items: [
            { text: 'core API', link: '/guide/reference/core-api' },
            { text: 'core 事件与常量', link: '/guide/reference/core-events' },
            { text: 'React 组件', link: '/guide/reference/react-components' },
            { text: 'React hooks', link: '/guide/reference/react-hooks' },
            { text: '插件 API', link: '/guide/reference/plugin-api' },
            { text: 'i18n API', link: '/guide/reference/i18n-api' },
          ],
        },
        {
          text: '贡献',
          items: [{ text: '发布流程', link: '/guide/release' }],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/formvk/designable' }],
    outline: { label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
  },
})
