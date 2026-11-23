import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['eslint', 'typescript', 'import'],
  env: {
    browser: true,
  },
  ignorePatterns: [
    '**/dist/**',
    '**/node_modules/**',
    '**/vendor/**',
    // 子仓库仅作参考，不参与 fork 的检查
    'designable/**',
  ],
  rules: {
    'typescript/consistent-type-imports': 'warn',
    'typescript/no-explicit-any': 'off',
    'eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
    // 合并同源重复 import（自动修复需 oxlint --fix-dangerously）
    'import/no-duplicates': 'warn',
  },
})
