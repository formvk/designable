import swc from '@rollup/plugin-swc'
import { withFilter } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    // rolldown/oxc 不会降级 accessor 与标准装饰器，源码测试需要 swc 提前转换
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
      // 直接指向源码，测试无需先构建 shared
      '@formvk/designable-shared': new URL('./packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['packages/*/src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
  },
})
