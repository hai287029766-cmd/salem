# Salem 1692 Online

Salem 1692 Online 是一个移动端优先的网页桌游项目，目标是把实体桌游 Salem 1692 搬到浏览器里：玩家创建房间、分享房间码、实时同步状态，并由系统自动处理抽牌、出牌、审判、夜晚、胜负结算等流程。

当前版本面向朋友局内测和生产环境迭代，已经部署到生产服务器验证过基础流程。内置语音使用 LiveKit 作为可选能力：如果没有配置 LiveKit 服务，界面会自动隐藏语音控件，不影响游戏。

## 功能状态

- 房间创建、加入、准备、开始游戏
- 4-8 人移动端多人流程
- Colyseus 实时状态同步
- 白天出牌、抽牌、结束回合
- 黎明黑猫、阴谋、夜间女巫行动、警长保护、认罪窗口
- 身份牌信息隔离和公开翻牌
- 角色能力入口和基础结算
- Toast 反馈、阶段提示、游戏内规则说明
- 卡牌与身份术语统一
- 未配置语音时稳定降级

## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19, Vite, TypeScript, Tailwind CSS, lucide-react |
| 实时服务 | Colyseus |
| 语音 | LiveKit client/server SDK，可选启用 |
| 后端 | Node.js, Express, TypeScript |
| 测试 | Playwright mobile E2E |
| 部署 | Nginx + PM2 + Git post-receive hook |

## 目录结构

```text
packages/
  client/      # React/Vite 移动端前端
  server/      # Express + Colyseus 游戏服务器
  shared/      # 前后端共享类型、卡牌常量、消息协议
tests/e2e/     # Playwright 多玩家端到端测试
knowledge/     # 规则资料
output/        # Super Dev 产物与项目文档
```

## 本地开发

### 环境要求

- Node.js 22+
- npm

### 安装依赖

```bash
npm install
cd packages/server && npm install
cd ../client && npm install
```

### 启动开发服务

开两个终端：

```bash
npm run dev:server
```

```bash
npm run dev:client -- --host 127.0.0.1 --port 5173
```

访问：

```text
http://127.0.0.1:5173
```

默认前端会连接 `127.0.0.1:2567` 的 Colyseus 服务。

## 环境变量

仓库提供 `.env.example` 作为模板。不要提交真实密钥。

### 服务端

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `PORT` | HTTP/Colyseus 服务端口 | `2567` |
| `LIVEKIT_URL` | LiveKit WebSocket 地址 | 空 |
| `LIVEKIT_API_KEY` | LiveKit API key | 开发占位 |
| `LIVEKIT_API_SECRET` | LiveKit API secret | 开发占位 |

### 前端

| 变量 | 说明 |
| --- | --- |
| `VITE_COLYSEUS_URL` | 可选，覆盖 Colyseus WebSocket 地址 |
| `VITE_API_URL` | 可选，覆盖 API base URL |
| `VITE_LIVEKIT_URL` | 可选，覆盖 LiveKit URL |

如果 `LIVEKIT_URL` 为空，后端 `/api/livekit-config` 会返回 `available:false`，前端不会显示语音按钮。

## 质量检查

构建：

```bash
npm run build
```

移动端多人 E2E：

```bash
npm run test:e2e -- --project=chromium-mobile
```

当前 E2E 覆盖：

- 语音未配置降级
- 4 人建房、加入、准备、开始
- 当前玩家抽牌
- 出牌后仍停留到主动结束回合
- 协调员结束倒计时触发默认摸牌
- 身份牌对本人和他人的可见性
- 阴谋阶段选牌
- 黑夜阶段女巫选择击杀目标
- 角色能力入口

## 生产部署

当前生产链路使用服务器上的 bare Git 仓库作为部署远端：

```text
production  ssh://ecs-openclaw/root/salem.git
```

推送到该远端会触发服务器 `post-receive` hook：

1. checkout 到生产工作区
2. 安装依赖
3. 构建 server 和 client
4. 通过 PM2 重启 `salem`

部署命令：

```bash
git push production main
```

GitHub 远端用于代码托管：

```text
origin  git@github.com:hai287029766-cmd/salem.git
```

推送 GitHub：

```bash
git push origin main
```

## LiveKit 语音说明

代码已经包含 LiveKit 语音接入：

- 客户端通过 `useVoiceConnection` 获取配置和 token
- 服务端提供 `/api/livekit-config` 和 `/api/livekit-token`
- 客户端连接成功后显示麦克风控制和说话状态

但 LiveKit 服务是可选部署项。朋友局可以先不启用内置语音，使用外部语音工具；等域名、HTTPS、端口和带宽准备好后，再配置自托管 LiveKit。

生产启用语音至少需要：

- HTTPS/WSS 域名
- LiveKit server
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- 安全组/防火墙开放 WebRTC 所需端口

## 安全注意

- 不要提交 `.env`、API key、token、私钥或密码
- 真实 LiveKit 密钥只放在服务器环境变量或服务器本地安全配置中
- 生产部署前先运行 `npm run build` 和 E2E
- 不要直接覆盖 Nginx、PM2、systemd 配置，先备份再改

## 项目状态

项目仍在 Super Dev 迭代流程中。核心文档在：

- `output/salem-prd.md`
- `output/salem-architecture.md`
- `output/salem-uiux.md`
- `output/salem-execution-plan.md`

规则资料在：

- `knowledge/salem-1692-rules.md`
