import { defineConfig } from 'oxfmt'

export default defineConfig({
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  singleQuote: true,
  semi: false,
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
  sortImports: true,
  sortPackageJson: true,
  ignorePatterns: [
    '**/dist/**',
    '**/node_modules/**',
    '**/vendor/**',
    // 子仓库仅作参考，不参与 fork 的格式化
    'designable/**',
  ],
})
