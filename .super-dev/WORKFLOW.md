# Super Dev Workflow

本文件是 Salem 1692 项目的 Super Dev 流程契约。触发 `/super-dev ...`、`super-dev: ...` 或 `super-dev：...` 时，当前宿主必须按本契约执行。

## 当前状态

- 项目已完成初始 research 与三份核心文档草案。
- 当前阶段：`spec`。
- 当前变更：`.super-dev/changes/playable-card-assets-e2e/`。
- 下一步：完成图片接入、前后端真实可玩修复和多玩家 E2E/语音链路验证。

## 阶段链

`research -> docs -> docs_confirm -> spec -> frontend -> preview_confirm -> backend -> quality -> delivery`

## 阶段要求

### research

- 先读取 `knowledge/`。
- 如存在 `output/knowledge-cache/*-knowledge-bundle.json`，优先继承其中约束。
- 调研结论写入 `output/salem-research.md`，不能只在聊天中口头描述。

### docs

- 维护三份核心文档：
  - `output/salem-prd.md`
  - `output/salem-architecture.md`
  - `output/salem-uiux.md`
- 所有后续实现必须继承三文档中的产品、架构和 UI 约束。

### docs_confirm

- 必须暂停等待用户确认。
- 用户要求修改时，先更新对应文档，再继续等待确认。
- 未确认前禁止创建 `.super-dev/changes/*` 或开始业务编码。

### spec

- 在用户确认三文档后创建变更目录：
  - `.super-dev/changes/<change-id>/proposal.md`
  - `.super-dev/changes/<change-id>/tasks.md`
  - `.super-dev/changes/<change-id>/plan.md`（复杂任务需要）

### frontend

- 前端优先，先做可运行、可预览的移动端主体验。
- UI 必须遵循 `output/salem-uiux.md`。
- 图标必须来自 `lucide-react`，禁止 emoji。
- 需要运行构建或本地预览验证。

### preview_confirm

- 前端预览后暂停等待用户确认。
- UI 不满意时，先更新 `output/salem-uiux.md`，再重做前端。

### backend

- 后端实现必须和 `packages/shared/src/*` 共享类型、消息协议一致。
- Colyseus 房间状态、LiveKit token、断线重连等实现必须按架构文档落地。

### quality

- 至少执行相关 build / type-check / smoke 验证。
- 发现问题先修复再汇报。

### delivery

- 汇总变更、验证结果、残留风险和下一步建议。

## 触发入口

- `/super-dev <需求>`
- `super-dev: <需求>`
- `super-dev：<需求>`
- `继续当前流程`
- `现在下一步是什么`
