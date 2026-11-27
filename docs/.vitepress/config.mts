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
      alias: {
        // 文档直接消费 workspace 源码，docs:dev / docs:build 不依赖预先构建的 dist
        '@formvk/designable-core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
        '@formvk/designable-shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      },
    },
  },
  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: '核心模型', link: '/guide/core-models' },
      { text: 'React 视图层', link: '/guide/react' },
      { text: '发布', link: '/guide/release' },
    ],
    sidebar: {
      '/guide/': [
        {
          text: '指南',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '核心模型', link: '/guide/core-models' },
            { text: 'React 视图层', link: '/guide/react' },
            { text: '发布流程', link: '/guide/release' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/formvk/designable' }],
    outline: { label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
  },
})
