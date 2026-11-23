import swc from '@rollup/plugin-swc'
import { defineConfig, withFilter } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    // rolldown/oxc 不会降级 accessor 与标准装饰器，这里用 swc 提前转换
    withFilter(
      swc({
        swc: {
          jsc: {
            parser: { syntax: 'typescript', decorators: true },
            transform: {
              // 使用 2023-11 版标准装饰器；插件默认值是 legacyDecorator: true，需显式关闭
              legacyDecorator: false,
              decoratorVersion: '2023-11',
            },
            // helper 走 @swc/helpers，避免每个源文件重复内联
            externalHelpers: true,
          },
        },
      }),
      // 仅当文件包含装饰器时才运行此转换
      { transform: { code: /^\s*@[\w$.]+/m } }
    ),
    // 依赖走 node_modules 解析，类型合并为单文件 index.d.ts
    dts({
      tsconfigPath: './tsconfig.build.json',
      entryRoot: 'src',
      bundleTypes: true,
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'Designable.Core',
      fileName: 'index',
      formats: ['es'],
    },
    rolldownOptions: {
      external: [
        '@formvk/reactive',
        '@formvk/shared',
        '@formvk/path',
        '@formvk/designable-shared',
        /^@swc\/helpers(\/|$)/,
      ],
    },
    sourcemap: true,
    minify: false,
    target: 'esnext',
  },
})
