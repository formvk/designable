import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

import less from 'less'
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
    {
      // 同时输出可被 Less 二次编译的源文件，并生成可选主题样式
      name: 'copy-less-sources',
      async closeBundle() {
        const source = readFileSync('src/styles/theme.less', 'utf8')
        const result = await less.render(source, {
          filename: 'src/styles/theme.less',
          paths: ['src/styles'],
        })
        mkdirSync('dist', { recursive: true })
        writeFileSync('dist/theme.css', result.css)
        cpSync('src/styles', 'dist/less/styles', { recursive: true })
      },
    },
  ],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: 'src/index.ts',
      name: 'Designable.React',
      fileName: 'index',
      formats: ['es'],
      cssFileName: 'index',
    },
    rolldownOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'classnames',
        '@formvk/reactive',
        '@formvk/reactive-react',
        '@formvk/shared',
        '@formvk/designable-core',
        '@formvk/designable-i18n',
        '@formvk/designable-react-icons',
        '@formvk/designable-shared',
      ],
    },
    sourcemap: true,
    minify: false,
    target: 'esnext',
  },
})
