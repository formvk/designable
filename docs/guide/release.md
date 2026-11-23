# 发布流程

仓库采用 **Lerna（version）+ pnpm publish（CI）** 的发包机制，包名统一使用 `@formvk/designable-` 前缀。

## 本地发版

```bash
# 常规版本：根据 conventional commits 计算版本号
pnpm version:release

# 预发布版本
pnpm version:alpha
pnpm version:beta
pnpm version:rc

# 预发布转正
pnpm version:exit-pre
```

`preversion` 会依次执行：

1. `pnpm install --frozen-lockfile`
2. `pnpm build`
3. `pnpm exec oxlint`
4. `pnpm format:check`
5. `pnpm exec vitest run`
6. `pnpm docs:build`

任一环节失败都会阻止版本提交。

## 提交钩子

`.husky/pre-commit` 调用 `lint-staged`，对暂存文件执行 `oxlint --fix-dangerously` 与 `oxfmt`。

## CI 发布

`.github/workflows/release.yml` 在主干收到 `chore(release)` 提交（或手动触发）时：

1. 安装依赖并构建全部工作区包
2. 执行测试
3. 检查待发布版本，避免重复发布造成“假成功”
4. 校验 npm token 与 `@formvk` scope 归属
5. `pnpm -r publish --access public --no-git-checks --tag <latest|alpha|beta|rc>`

预发布版本会自动使用对应 dist-tag，不会覆盖 `latest`。CI 需要仓库 Secret `FORMVK`
（npm Automation token）。

## 包约定

- `main` / `module` / `types` 均指向 `dist/index.js` 与 `dist/*.d.ts`
- `files` 仅包含 `dist`
- `publishConfig.access` 为 `public`
- `workspace:` 协议会在发布时被 pnpm 替换为真实版本号
