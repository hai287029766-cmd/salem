# Salem 1692 Project Brief

## 项目定位

Salem 1692 实体桌游的手机端 Web 在线版，支持 4-12 人实时语音对战。目标是让玩家通过浏览器创建房间、分享房间码、语音推理并完成自动化规则结算。

## 关键约束

- 移动端竖屏优先，重点适配 iOS Safari 和 Android Chrome。
- 实时状态同步使用 Colyseus。
- 实时语音使用 LiveKit。
- 前后端共享协议放在 `packages/shared/src/*`。
- UI 视觉走殖民时代暗色、羊皮纸、木质桌面、烛火暖光方向。
- 禁止紫色/粉色渐变 AI 模板风格。
- 禁止 emoji 作为图标。

## 现有文档

- `knowledge/salem-1692-rules.md`
- `output/salem-research.md`
- `output/salem-prd.md`
- `output/salem-architecture.md`
- `output/salem-uiux.md`
- `output/salem-execution-plan.md`

## 当前阶段

`docs_confirm`

三份核心文档已存在，下一步应由用户确认或提出修改意见。确认前不进入 Spec 和编码。

