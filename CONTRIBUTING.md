# Contributing

Salem 1692 Online 当前处于快速迭代阶段。提交变更前，请尽量保持改动聚焦、可验证，并避免把本地生成物或密钥提交到仓库。

## 开发流程

1. 从 `main` 创建分支。
2. 修改前先阅读相关模块和共享类型。
3. 前后端消息、卡牌类型、事件类型优先从 `packages/shared/src/*` 扩展。
4. UI 图标使用 `lucide-react`，不要使用 emoji 作为功能图标。
5. 移动端优先，重点检查 375px-428px 竖屏视口。

## 本地验证

至少运行：

```bash
npm run build
```

涉及游戏流程、状态同步或 UI 交互时，运行：

```bash
npm run test:e2e -- --project=chromium-mobile
```

## 提交前检查

```bash
git status --short
git diff --check
```

不要提交：

- `.env`、密钥、token、私钥
- `node_modules/`
- `dist/`
- `playwright-report/`
- `test-results/`
- `*.tsbuildinfo`
- 临时截图或调试文件

## 生产部署

GitHub 的 `origin` 只负责代码托管和 CI。生产部署使用单独远端：

```bash
git push production main
```

该操作会触发服务器部署 hook，并重启 PM2 进程。执行前必须确认本地 build/E2E 通过。

