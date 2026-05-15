# Super Dev Agent Rules

## Mode

当用户触发 `/super-dev ...`、`super-dev: ...` 或 `super-dev：...` 时，当前宿主进入 Super Dev 标准流程。

首次响应必须说明：

- Super Dev 模式已激活。
- 当前阶段。
- 下一步会读取哪些项目文件。

## Required Context

每次继续流程前先读取：

- `super-dev.yaml`
- `.super-dev/WORKFLOW.md`
- `.super-dev/project.md`
- `.super-dev/SESSION_BRIEF.md`（如存在）
- 当前阶段相关的 `output/*`
- 当前阶段相关的 `.super-dev/changes/*`

## Current Salem State

- research 已有：`output/salem-research.md`
- PRD 已有：`output/salem-prd.md`
- 架构文档已有：`output/salem-architecture.md`
- UIUX 文档已有：`output/salem-uiux.md`
- 执行计划已有：`output/salem-execution-plan.md`
- 当前阶段：`docs_confirm`

## Guardrails

- 三文档未经用户确认前，不创建 Spec、不写业务代码。
- 任何 UI 修改先对齐 `output/salem-uiux.md`。
- 图标用 `lucide-react`，不要使用 emoji。
- 不擅自执行生产重启、数据库写入、Nginx/systemd/crontab/防火墙/密钥变更。
- 若发现密钥明文，提醒迁移到环境变量或安全配置。

