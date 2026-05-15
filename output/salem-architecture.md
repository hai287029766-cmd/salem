# Salem 1692 线上桌游 -- 架构文档

> 版本: 1.0 | 日期: 2026-05-15

---

## 1. 系统架构

```
                         [手机浏览器]
                              |
                         HTTPS / WSS
                              |
                    [Nginx :18790 反向代理]
                         /          \
                        /            \
            [Colyseus :2567]    [LiveKit :7880/7881]
            (游戏逻辑+静态资源)    (语音 SFU 服务器)
                        \            /
                         \          /
                      [PM2 进程管理]
                              |
                    [火山引擎 ECS 115.190.232.225]
                    [Ubuntu 24.04 | 8GB RAM | 40G SSD]
```

### 端口规划

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx (Salem) | 18790 | 对外入口 |
| Colyseus | 2567 | 游戏服务器(内部) |
| LiveKit | 7880 | WebRTC 信令(内部) |
| LiveKit | 7881 | RTC UDP/TCP(需开放) |
| OpenClaw (已有) | 18789 | 不冲突 |
| IdeaMatrix (已有) | 8800 | 不冲突 |

---

## 2. 技术栈

| 层级 | 技术 | 版本 | 理由 |
|------|------|------|------|
| 游戏服务器 | Colyseus | 0.16+ | 内置房间/状态同步/断线重连/信息隔离 |
| 语音服务器 | LiveKit | latest | Go 单二进制，自托管 SFU，支持 6-100 人 |
| 后端运行时 | Node.js | 20 LTS | Colyseus 依赖 |
| 前端框架 | React | 19 | Colyseus SDK 一等支持 |
| 构建工具 | Vite | 6+ | 快速构建，HMR |
| 样式 | TailwindCSS | 4 | 移动端 utility-first |
| 动画 | Framer Motion | 11+ | 卡牌翻转动画 |
| 图标 | Lucide React | latest | 轻量，零 emoji |
| 语言 | TypeScript | 5.5+ | 前后端类型共享 |
| 进程管理 | PM2 | latest | 自动重启+日志 |
| 反向代理 | Nginx | 已有 | WebSocket 升级 |

---

## 3. 项目结构

```
salem/
├── package.json              # monorepo root
├── packages/
│   ├── server/               # Colyseus 游戏服务器
│   │   ├── src/
│   │   │   ├── index.ts            # 入口，创建 Colyseus Server
│   │   │   ├── rooms/
│   │   │   │   └── SalemRoom.ts    # 游戏房间（状态机+全部逻辑）
│   │   │   ├── schema/
│   │   │   │   ├── SalemState.ts   # 游戏状态 Schema
│   │   │   │   ├── Player.ts       # 玩家 Schema
│   │   │   │   └── Card.ts         # 卡牌 Schema
│   │   │   ├── game/
│   │   │   │   ├── GameEngine.ts   # 核心游戏逻辑（回合/指控/夜间）
│   │   │   │   ├── CardDeck.ts     # 牌堆管理
│   │   │   │   ├── Characters.ts   # 角色能力定义
│   │   │   │   └── WinChecker.ts   # 胜负判定
│   │   │   └── livekit/
│   │   │       └── token.ts        # LiveKit token 生成
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── client/               # React 前端
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Home.tsx        # 首页（创建/加入房间）
│   │   │   │   ├── Lobby.tsx       # 等待室
│   │   │   │   ├── Game.tsx        # 游戏主界面
│   │   │   │   └── Result.tsx      # 结算页
│   │   │   ├── components/
│   │   │   │   ├── PlayerSeat.tsx  # 玩家座位组件
│   │   │   │   ├── CardHand.tsx    # 手牌区
│   │   │   │   ├── ActionPanel.tsx # 操作面板
│   │   │   │   ├── GameLog.tsx     # 游戏日志
│   │   │   │   ├── Timer.tsx       # 倒计时
│   │   │   │   ├── VoicePanel.tsx  # 语音控制
│   │   │   │   └── PhaseBar.tsx    # 阶段指示器
│   │   │   ├── hooks/
│   │   │   │   ├── useColyseus.ts  # Colyseus 连接管理
│   │   │   │   ├── useLiveKit.ts   # 语音连接管理
│   │   │   │   └── useGameState.ts # 游戏状态订阅
│   │   │   ├── assets/
│   │   │   │   ├── cards/          # 卡牌图片素材
│   │   │   │   └── sounds/         # 音效文件
│   │   │   └── styles/
│   │   │       └── index.css       # Tailwind 入口
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   └── shared/               # 前后端共享类型
│       ├── src/
│       │   ├── types.ts            # 游戏类型定义
│       │   ├── constants.ts        # 卡牌数据/配置常量
│       │   └── messages.ts         # 消息类型定义
│       ├── tsconfig.json
│       └── package.json
├── ecosystem.config.js       # PM2 配置
├── nginx.conf                # Nginx 配置片段
└── deploy.sh                 # 部署脚本
```

---

## 4. 核心数据模型 (Colyseus Schema)

### 4.1 游戏状态

```typescript
// SalemState.ts
class SalemState extends Schema {
  @type("string") gamePhase: GamePhase;
  @type("string") currentPlayerId: string;
  @type("number") timer: number;
  @type("boolean") isPaused: boolean;         // 协调员暂停状态
  @type("string") coordinatorId: string;      // 协调员玩家ID
  @type("number") round: number;
  @type("number") deckRemaining: number;
  @type({ map: Player }) players = new MapSchema<Player>();
  @type(["string"]) gameLog = new ArraySchema<string>();
  @type("string") blackCatOwnerId: string;
  @type("boolean") isNightKillResolved: boolean;
}
```

### 4.2 玩家

```typescript
// Player.ts
class Player extends Schema {
  @type("string") id: string;
  @type("string") name: string;
  @type("string") seatIndex: number;
  @type("boolean") isAlive: boolean;
  @type("boolean") isReady: boolean;
  @type("boolean") isHost: boolean;
  @type("string") characterName: string;     // 城镇大厅卡（公开）
  @type("string") characterAbility: string;  // 能力描述（公开）
  @type("number") accusationPoints: number;  // 面前的指控点数（公开）
  @type("boolean") hasStocks: boolean;       // 是否被枷锁
  @type("boolean") hasAsylum: boolean;       // 是否有庇护
  @type("boolean") hasPiety: boolean;        // 是否有虔诚
  @type("boolean") hasMatchmaker: boolean;   // 是否有红线
  @type("boolean") hasBlackCat: boolean;     // 是否有黑猫
  @type("number") tryalCardCount: number;    // 审判卡总数（公开）
  @type("number") tryalCardFaceUp: number;   // 已翻开数（公开）
  
  // 以下字段通过 @filter 仅对本人可见
  @type(["string"]) handCards;       // 手牌（仅自己可见）
  @type(["string"]) tryalCards;      // 审判卡详情（仅自己可见）
}
```

### 4.3 消息协议

```typescript
// 客户端 -> 服务端
type ClientMessages = {
  "ready": {};
  "start_game": { coordinatorId?: string };
  "play_cards": { cards: string[], targetId: string };
  "draw_cards": {};
  "choose_tryal_card": { targetId: string, cardIndex: number };
  "witch_place_blackcat": { targetId: string };
  "witch_kill": { targetId: string };
  "constable_protect": { targetId: string };
  "confess": { cardIndex: number };
  "conspiracy_pass": { cardIndex: number };
  // 协调员专属指令
  "coordinator_pause": {};
  "coordinator_resume": {};
  "coordinator_extend_time": { seconds: number };  // +30 或 +60
  "coordinator_skip_phase": {};
  "coordinator_end_timer": {};
};

// 服务端 -> 客户端（通过 Schema 状态同步 + 事件广播）
type ServerMessages = {
  "phase_change": { phase: GamePhase, data?: any };
  "card_revealed": { playerId: string, card: string };
  "player_killed": { playerId: string, reason: string };
  "game_over": { winner: "townspeople" | "witches", reveals: PlayerReveal[] };
  "sound_effect": { type: SoundType };
  "your_role": { isWitch: boolean, isConstable: boolean, witchPartners?: string[] };
};
```

---

## 5. 游戏状态机

```
LOBBY
  |-- [房主点击开始, 人数>=4]
  v
DEALING (发牌, 2秒自动推进)
  |
  v
DAWN (女巫放黑猫, 10秒)
  |
  v
DAY_TURN (当前玩家操作, 60秒)
  |-- [选择出牌] -> 处理卡牌效果
  |     |-- [触发审判] -> TRYAL (选择翻哪张卡)
  |     |-- [正常结束] -> 下一玩家 DAY_TURN
  |-- [选择抽牌] -> 抽2张
  |     |-- [抽到阴谋] -> CONSPIRACY (所有人选卡左传, 30秒)
  |     |-- [抽到黑夜] -> NIGHT_WITCH
  |     |-- [普通卡牌] -> 下一玩家 DAY_TURN
  |
NIGHT_WITCH (女巫选目标, 30秒)
  |
  v
NIGHT_CONSTABLE (警长选保护, 15秒)
  |
  v
NIGHT_CONFESS (所有人可认罪, 30秒)
  |
  v
NIGHT_RESOLVE (结算击杀, 5秒展示)
  |-- [检查胜负]
  |     |-- [游戏结束] -> GAME_OVER
  |     |-- [继续] -> 重建牌堆 -> DAY_TURN
  |
GAME_OVER (展示结果, 可重开)
```

---

## 6. 语音架构 (LiveKit)

### 6.1 连接流程

```
1. 玩家加入房间 -> Colyseus 分配座位
2. 客户端请求 LiveKit Token -> 服务端生成（含房间名+玩家身份）
3. 客户端连接 LiveKit Room -> 自动发布/订阅音频轨道
4. 游戏阶段变化 -> 服务端通过 LiveKit API 控制静音
```

### 6.2 语音规则

| 阶段 | 语音状态 |
|------|----------|
| 等待室 | 全员可说话 |
| 黎明 | 全员静音（系统控制） |
| 白天 | 全员可说话 |
| 夜间-女巫选择 | 仅女巫可说话（私密频道） |
| 夜间-认罪窗口 | 全员静音 |
| 结算 | 全员可说话 |

### 6.3 LiveKit 部署

```bash
# 安装 LiveKit Server（单二进制）
curl -sSL https://get.livekit.io | bash

# 配置文件 /etc/livekit.yaml
port: 7880
rtc:
  port_range_start: 7881
  port_range_end: 7981
  use_external_ip: true
keys:
  salem_api_key: <generated_secret>

# Systemd 管理
systemctl enable livekit-server
systemctl start livekit-server
```

### 6.4 Token 生成（服务端）

```typescript
import { AccessToken } from 'livekit-server-sdk';

function generateVoiceToken(roomCode: string, playerId: string, playerName: string): string {
  const token = new AccessToken(API_KEY, API_SECRET, {
    identity: playerId,
    name: playerName,
  });
  token.addGrant({
    room: `salem-${roomCode}`,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
  });
  return token.toJwt();
}
```

---

## 7. 信息隔离策略

| 数据 | 可见性 | 实现方式 |
|------|--------|----------|
| 手牌 | 仅本人 | Colyseus @filter |
| 审判卡内容 | 仅本人（未翻时） | Colyseus @filter |
| 审判卡数量 | 全员 | 公开字段 |
| 已翻审判卡 | 全员 | 事件广播 |
| 面前的蓝/红卡 | 全员 | 公开字段 |
| 女巫身份 | 仅女巫互知 | @filter + 夜间消息 |
| 警长身份 | 仅本人 | @filter |
| 女巫杀谁 | 仅女巫 | 定向消息 |
| 警长保谁 | 仅警长 | 定向消息 |

---

## 8. Nginx 配置

```nginx
# /etc/nginx/sites-available/salem
server {
    listen 18790;
    server_name _;

    # 前端静态资源
    location / {
        proxy_pass http://127.0.0.1:2567;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # LiveKit WebSocket 信令
    location /livekit {
        proxy_pass http://127.0.0.1:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }
}
```

---

## 9. 部署流程

```bash
#!/bin/bash
# deploy.sh
set -e

cd /root/salem
git pull origin main
cd packages/server && npm ci && npx tsc
cd ../client && npm ci && npm run build
cd ../..

# 将前端构建产物复制到 server 的 static 目录
cp -r packages/client/dist packages/server/static

pm2 restart salem-server || pm2 start ecosystem.config.js --env production
echo "Deploy complete"
```

---

## 10. API 路径定义

| 路径 | 方法 | 说明 |
|------|------|------|
| / | GET | 前端页面（静态资源） |
| /colyseus | WS | Colyseus WebSocket（自动） |
| /api/livekit-token | POST | 获取 LiveKit Token |
| /api/health | GET | 健康检查 |

---

## 11. 资源预估

| 资源 | 预估 |
|------|------|
| Colyseus 进程 | ~100MB RAM |
| LiveKit Server | ~100-200MB RAM |
| 每个房间(9人) | ~3MB RAM |
| 每个语音房间(9人) | ~50MB RAM |
| 总计(10个并发房间) | ~800MB RAM |
| 可用(扣除现有服务) | ~4GB |
| 结论 | 绰绰有余 |
