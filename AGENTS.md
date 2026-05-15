# Codex Project Rules

本项目已接入 Super Dev。Codex 在 `/Users/reborn/Projects/salem` 工作时，必须把 `.super-dev`、`super-dev.yaml`、`knowledge/` 和 `output/` 视为项目治理状态。

## Required Reading

开始任务前按需读取：

- `super-dev.yaml`
- `.super-dev/WORKFLOW.md`
- `.super-dev/project.md`
- `.super-dev/AGENTS.md`
- `.super-dev/SESSION_BRIEF.md`（如存在）
- `output/*-bootstrap.md`（如存在）
- 与任务相关的 `knowledge/*`
- 与任务相关的 `output/*-research.md`、`output/*-prd.md`、`output/*-architecture.md`、`output/*-uiux.md`
- 与任务相关的 `.super-dev/changes/*/proposal.md` 和 `tasks.md`

## Super Dev Trigger

- 用户输入 `/super-dev ...`、`super-dev: ...`、`super-dev：...` 时，立即进入 Super Dev 标准流程，不按普通聊天处理。
- 用户输入 `/super-dev-seeai ...`、`super-dev-seeai: ...`、`super-dev-seeai：...` 时，进入 SEEAI 快速交付流程。
- 如果仓库中已存在 `super-dev.yaml`、`.super-dev/WORKFLOW.md`、`output/*` 或未完成流程状态，新会话中的第一个自然语言需求默认按继续 Super Dev 流程处理。
- 首次响应必须明确说明 Super Dev 模式已激活，并说明当前阶段。

## Workflow Contract

标准阶段链：

`research -> docs -> docs_confirm -> spec -> frontend -> preview_confirm -> backend -> quality -> delivery`

- research 阶段先读取 `knowledge/` 与 `output/knowledge-cache/*-knowledge-bundle.json`（如存在），再做竞品或官方资料研究。
- 三份核心文档为 `output/*-prd.md`、`output/*-architecture.md`、`output/*-uiux.md`。
- 三文档完成后必须等待用户确认，未经确认不创建 Spec、不写业务代码。
- 前端预览完成后必须等待用户确认，未经确认不进入后端重活或交付。
- 用户在确认门内说“修改”“补充”“继续改”“确认”“通过”“继续”等，仍属于当前 Super Dev 流程，不退出。
- UI 不满意时，先更新 `output/*-uiux.md`，再重做前端并验证。
- 架构不合理时，先更新 `output/*-architecture.md`，再调整 Spec 和实现。

## Project Context

- 项目：Salem 1692 线上桌游。
- 领域：移动端 Web、实时桌游、社交推理、语音对战。
- 技术栈：TypeScript / React / Vite / TailwindCSS / Colyseus / LiveKit / Node.js。
- 部署形态：Nginx 反向代理 + PM2 管理 Node 服务，LiveKit 自托管语音服务。
- 现有核心文档：`output/salem-research.md`、`output/salem-prd.md`、`output/salem-architecture.md`、`output/salem-uiux.md`、`output/salem-execution-plan.md`。

## Coding Constraints

- 代码修改前先读相关文件和现有实现。
- 前端图标必须使用 `lucide-react`，禁止用 emoji 作为功能图标、装饰图标或占位。
- UI 遵循 `output/salem-uiux.md` 的设计 token 与移动端优先方案。
- 前后端消息名、API 路径、共享类型必须与 `packages/shared/src/*` 和架构文档保持一致。
- TypeScript 尽量保持严格类型，不新增无意义 `any`。
- 不把 API Key、token、私钥、密码写入可提交文件。
- 修改后尽量运行最小验证，并说明验证结果。

## High-Risk Operations

未经用户明确确认，不执行以下操作：

- 删除文件、重置 git、覆盖配置或迁移目录。
- 生产服务重启/停止。
- 数据库写入、迁移或清空。
- 防火墙、Nginx、systemd、crontab、密钥相关变更。

