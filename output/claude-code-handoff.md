# Claude Code 交接文档 - Salem 1692

更新时间：2026-05-15  
工作目录：`/Users/reborn/Projects/salem`

## 1. 当前结论

项目已经接入 Super Dev 流程，当前变更目录为：

- `.super-dev/changes/playable-card-assets-e2e/`

上一轮已经实现并验证过一版“可启动、可 4 人建房开局、可执行核心白天动作”的版本。用户随后继续反馈了新的规则与 UI 问题，本轮已开始修复，并且当前代码已通过：

```bash
npm run build
```

但注意：本轮最新修复尚未跑完整 Playwright E2E，也尚未做人工浏览器完整体验验收。Claude Code 接手后应先跑 E2E 和浏览器烟测。

## 2. 技术栈与入口

- 前端：React / Vite / TailwindCSS / lucide-react
- 后端：Node.js / Colyseus
- 语音：LiveKit，用户本机没有 LiveKit server
- 共享类型：`packages/shared/src/*`
- 前端入口：`packages/client/src/pages/Game.tsx`
- 核心规则：`packages/server/src/game/GameEngine.ts`
- 牌堆：`packages/server/src/game/CardDeck.ts`
- 房间消息：`packages/server/src/rooms/SalemRoom.ts`
- E2E：`tests/e2e/salem-multiplayer.spec.ts`

启动命令：

```bash
npm run dev:server
npm run dev:client -- -- --host 127.0.0.1 --port 5173
```

验证命令：

```bash
npm run build
npx playwright test tests/e2e/salem-multiplayer.spec.ts
```

Playwright 会通过 `playwright.config.ts` 以 `SALEM_E2E=1` 启动后端，启用测试辅助接口。

## 3. 已实现功能

### 3.1 Super Dev 与项目治理

- 已有 `super-dev.yaml`
- 已有 `.super-dev/WORKFLOW.md`
- 已有 `.super-dev/project.md`
- 已有 `.super-dev/AGENTS.md`
- 已有核心文档：
  - `output/salem-research.md`
  - `output/salem-prd.md`
  - `output/salem-architecture.md`
  - `output/salem-uiux.md`
  - `output/salem-execution-plan.md`

当前任务的 proposal/tasks：

- `.super-dev/changes/playable-card-assets-e2e/proposal.md`
- `.super-dev/changes/playable-card-assets-e2e/tasks.md`

### 3.2 卡牌图片与 UI

- 已接入用户提供的实体图素材和裁切后的物理卡牌图。
- `packages/client/src/assets/cardAssets.ts` 建立了卡牌类型到图片的映射。
- `GameCard` 优先显示实物图，缺失时保留 CSS 降级卡面。
- 审判卡图片也已接入：
  - `tryal-witch.jpg`
  - `tryal-not-witch.jpg`
  - `tryal-constable.jpg`

### 3.3 多人游戏基础链路

已实现：

- 创建房间
- 加入房间
- 准备
- 开始游戏
- Colyseus 状态同步
- 玩家私有手牌和身份牌视图
- 房间码 API
- E2E 测试辅助 API，仅在 `SALEM_E2E=1` 时启用

### 3.4 语音链路

- 本机未配置 LiveKit server 时，前端稳定显示“语音未配置”。
- 麦克风按钮在未配置状态禁用。
- 已避免“语音未连接 / 语音连接中”反复跳变。
- 真实语音通话未测试，因为用户确认本机没有 LiveKit server。

### 3.5 已覆盖的游戏规则

此前已完成并跑通过的 E2E 覆盖：

- 语音未配置稳定降级，4 人建房/加入/准备/开始不阻塞
- 4 人开始游戏，当前玩家点击抽牌
- 出牌后不自动跳过，可手动结束回合
- 未出牌时协调员结束倒计时，默认抽牌
- 身份牌：本人可见真实身份，他人只见背面或公开牌
- 抽到阴谋/传染卡后进入阴谋阶段，可从左手边玩家选择未公开身份牌
- 抽到黑夜卡后进入夜间，女巫可点击选择击杀目标
- 角色能力入口可点击并发送技能动作

对应文件：

- `tests/e2e/salem-multiplayer.spec.ts`

## 4. 用户最新反馈与本轮已处理内容

用户最新反馈要点：

1. 开局应该先是黑夜/黎明，女巫选择把黑猫放到某个玩家面前。
2. 玩家出一张牌后无法结束本轮。
3. 当前 UI 布局太小，不清晰；希望用卡片展示玩家全部数据，美观、大气、清晰。
4. 多抽几轮后出现连续两次没牌进入黑夜。
5. 夜晚后再抽牌，第一个角色拿到了黑夜和感染，但没有立即执行。
6. 再抽牌后所有角色手牌清空，抽牌堆也空了。

本轮已经改到构建通过：

### 4.1 开局黑猫放置

服务端：

- `packages/server/src/game/GameEngine.ts`
  - 新增 `dawnBlackCatPlacedBy`
  - `handleDawnPhase()` 进入黎明时清空放置记录
  - `handleWitchPlaceBlackCat()` 允许女巫在黎明阶段手动选择黑猫目标
  - 所有存活女巫都选择后，直接进入白天

前端：

- `packages/client/src/pages/Game.tsx`
  - 新增 `DawnBlackCatOverlay`
  - 女巫在黎明阶段可以点玩家卡片放置黑猫
  - 非女巫看到“等待女巫放置黑猫”

### 4.2 出牌后结束回合状态

服务端：

- `packages/server/src/schema/SalemState.ts`
  - 新增 `currentTurnCanEnd`
- `packages/server/src/game/GameEngine.ts`
  - 出牌成功后设置 `currentTurnCanEnd = true`
  - 回合结束、抽到黑色事件牌、进入新回合时重置为 `false`

前端：

- `packages/client/src/hooks/useGameState.ts`
  - 读取 `currentTurnCanEnd`
- `packages/client/src/pages/Game.tsx`
  - 结束回合按钮现在以 `state.currentTurnCanEnd || playedThisTurn` 判断是否可用

### 4.3 玩家信息卡片化

前端：

- `packages/client/src/components/PlayerSeat.tsx`
  - 重写为大卡片 UI
  - 展示：
    - 玩家姓名
    - 我/当前回合/已死亡/发言状态
    - 角色名与 hover/click 能力说明
    - 手牌数量
    - 身份牌数量与翻开数量
    - 指控值和进度条
    - 黑猫、庇护、虔诚、红线、枷锁等公开状态
    - 身份牌排布，本人显示真实身份，他人显示背面或已公开内容
- `packages/client/src/pages/Game.tsx`
  - 玩家区从小头像椭圆布局改为响应式大卡片网格

服务端：

- `packages/server/src/schema/Player.ts`
  - 新增公开字段 `handCardCount`
- `packages/server/src/game/GameEngine.ts`
  - 新增 `syncHandCount(player)`
  - 发牌、抽牌、出牌、抢劫、死亡清手牌、测试设置手牌等位置同步手牌数量

### 4.4 夜晚后黑夜/阴谋进入手牌的问题

根因：

旧逻辑在夜晚结束后先 `rebuildDeck()`，把 `conspiracy` 和 `night` 放回牌堆，再给存活玩家发 3 张新手牌。这样黑夜/阴谋可能直接发进玩家手牌，不会被“抽到即发动”。

已改：

- `packages/server/src/game/CardDeck.ts`
  - 新增 `prepareForNewDayHands()`
  - 夜晚后先把 `night` 和 `conspiracy` 从牌堆/弃牌堆中移除，洗混普通牌
  - 发完存活玩家手牌后，再 `finalizeInitialDeck()`：阴谋洗回，黑夜放底部
- `packages/server/src/game/GameEngine.ts`
  - `finishNightResolve()` 改为先 `prepareForNewDayHands()`，发手牌后再 `finalizeInitialDeck()`

### 4.5 抽牌堆空时弃牌堆回收

已改：

- `packages/server/src/game/CardDeck.ts`
  - `drawTop()` 在牌堆空时调用 `recycleDiscardPileIntoDeck()`
  - 回收弃牌堆时：
    - 普通牌洗入牌堆
    - 阴谋洗回牌堆
    - 黑夜放到底部

这修复用户反馈的“抽牌堆和所有手牌都空掉后无法继续”的核心风险。

## 5. 当前验证状态

已验证：

```bash
npm run build
```

结果：

- server build 通过
- client build 通过
- Vite 仍提示 LiveKit chunk 超过 500KB，这是现有体积警告，不阻塞构建

尚未验证：

- 本轮最新改动后的完整 E2E
- 浏览器内真实多玩家连续几轮体验
- 黎明女巫放黑猫 UI 的实际点击体验
- 夜晚后发牌是否绝不再把黑夜/阴谋发到手牌
- 抽牌堆耗尽后的弃牌堆回收是否符合完整桌游节奏

## 6. 接下来建议 Claude Code 优先做什么

### P0：先跑完整回归

```bash
npx playwright test tests/e2e/salem-multiplayer.spec.ts
```

重点看旧 E2E 是否因新增黎明黑猫手动步骤而失败。很可能需要更新 `startFourPlayerGame()`：开局后如果停在 `dawn`，找到女巫页面的 `dawn-black-cat-target-*` 并点击任意目标，然后再等待白天。

建议新增 helper：

- `resolveDawnBlackCat(players)`
  - 在所有页面中寻找可见的 `[data-testid^="dawn-black-cat-target-"]`
  - 点击第一个目标
  - 等待所有玩家进入白天

### P0：补 E2E 用例

新增或更新测试：

1. 开局黎明阶段女巫能放置黑猫，黑猫持有者成为第一位行动玩家。
2. 出牌后结束回合按钮可用，并且点击后换到下一位玩家。
3. 夜晚结算后重新发手牌时，玩家手牌中不会出现 `night` 和 `conspiracy`。
4. 抽牌堆空时弃牌堆回收，抽牌不会把所有人手牌/牌堆清空到死局。
5. 抽到 `night` 或 `conspiracy` 必须立即进入对应阶段，不进入手牌。

### P0：浏览器人工烟测

用户当前 in-app browser 在：

- `http://127.0.0.1:5173/`

建议流程：

1. 重启普通开发服务。
2. 建 4 个浏览器 context。
3. 建房、加入、准备、开始。
4. 确认黎明阶段女巫可点玩家放黑猫。
5. 进入白天后让当前玩家出 1 张牌，再点结束回合。
6. 连续抽牌到黑夜/阴谋，确认立即触发。
7. 夜晚结算后再抽牌，确认黑夜/阴谋不在手牌中。

### P1：继续完善 UI

当前 `PlayerSeat` 已改为大卡片布局，但还没经过截图/人工审美验收。建议用 Playwright 截图检查：

- iPhone 14 视口：390x844
- 桌面视口：1280x900

重点看：

- 玩家卡片是否过高导致手牌区/操作区被挤压
- 4 人、8 人、12 人布局是否清晰
- 角色能力弹层是否遮挡严重
- 夜间 overlay 与玩家卡片层级是否正常

### P1：补服务端测试辅助接口

已有：

- `POST /api/test/rooms/:roomCode/top-card`
- `POST /api/test/rooms/:roomCode/player-hand`

建议新增：

- 设置牌堆为指定序列，便于稳定测试弃牌堆回收和连续黑牌。
- 查询房间内部调试状态，仅 E2E 模式可用：
  - deck size
  - discard size
  - 每个玩家手牌数量
  - 当前阶段
  - 当前玩家

### P1：规则细化

角色技能现在是“入口 + 部分能力”的可玩版本，不是完整桌游规则：

- Samuel Parris：已实现从弃牌堆抽最多 2 张
- Tituba：服务端支持查看/提交牌堆顺序，但前端缺少完整重排 UI
- John Proctor：服务端有死者手牌拾取逻辑，前端只做了极简触发
- 其他角色多为被动或日志提示

如果要继续往“真实桌游完整可玩”走，建议把角色技能单独开一个 Super Dev change。

## 7. 注意事项与风险

### 7.1 没有 git 仓库

此前检查过 `git status` 失败，当前目录看起来没有 `.git`。不要依赖 git diff/commit。Claude Code 接手前建议先做文件备份或手动初始化版本管理。

### 7.2 不要启用真实生产操作

用户只需要本地开发体验。不要改：

- Nginx
- PM2
- systemd
- crontab
- 防火墙
- 生产数据库
- 密钥配置

### 7.3 LiveKit

用户确认本机没有 LiveKit server。当前正确目标是“语音未配置时稳定降级，不阻塞游戏”。除非用户提供 LiveKit URL/API key，否则不要把真实语音失败视为游戏失败。

### 7.4 黑猫/阴谋规则有细节待确认

用户明确说：传染卡/阴谋的功能是“每个玩家向左手边存活玩家获取一张未翻开的身份卡，玩家手动选取”。当前实现按这个规则走。

规则文档里还提到“黑猫持有者抽到阴谋时有特殊选择权”，当前项目实现还没有完全细化这个例外。如果要严格还原，需要继续设计。

## 8. 本轮修改文件清单

本轮最新改动过：

- `packages/server/src/schema/Player.ts`
- `packages/server/src/schema/SalemState.ts`
- `packages/server/src/game/CardDeck.ts`
- `packages/server/src/game/GameEngine.ts`
- `packages/client/src/hooks/useGameState.ts`
- `packages/client/src/pages/Game.tsx`
- `packages/client/src/components/PlayerSeat.tsx`

此前已实现过的重要文件：

- `packages/shared/src/messages.ts`
- `packages/server/src/rooms/SalemRoom.ts`
- `packages/server/src/index.ts`
- `packages/client/src/hooks/useVoiceConnection.ts`
- `packages/client/src/hooks/useColyseus.ts`
- `packages/client/src/components/ActionPanel.tsx`
- `packages/client/src/components/NightOverlay.tsx`
- `packages/client/src/components/VoicePanel.tsx`
- `packages/client/src/pages/Lobby.tsx`
- `tests/e2e/salem-multiplayer.spec.ts`
- `playwright.config.ts`

## 9. 推荐交接启动命令

Claude Code 接手后建议第一步：

```bash
cd /Users/reborn/Projects/salem
npm run build
npx playwright test tests/e2e/salem-multiplayer.spec.ts
```

如果 E2E 失败，先检查是否因为开局新增了黎明黑猫放置步骤。这个是最可能需要更新测试 helper 的地方。

