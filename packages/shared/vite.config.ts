import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
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
      name: 'Designable.Shared',
      fileName: 'index',
      formats: ['es'],
    },
    rolldownOptions: {
      external: ['@formvk/shared'],
    },
    sourcemap: true,
    minify: false,
    target: 'esnext',
  },
})
