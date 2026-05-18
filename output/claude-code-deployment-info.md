# Claude Code 部署信息交接 - aideamatrix.com / Salem

更新时间：2026-05-15  
项目目录：`/Users/reborn/Projects/salem`

## 1. 已知域名信息

域名：

```text
aideamatrix.com
```

从用户截图确认：

- 域名已注册成功
- 域名状态：正常
- 实名认证状态：实名认证成功
- DNS 状态：正常
- DNS 服务商：火山引擎 / 字节云解析 DNS
- 分配的 DNS 服务器：

```text
ns1.volcengine-dns.com
ns2.volcengine-dns.com
```

用户说明：

```text
备案已完成
```

建议本项目使用子域名：

```text
salem.aideamatrix.com
```

理由：`aideamatrix.com` 主域名可以保留给官网或后续产品入口，Salem 桌游项目用独立子域名更清晰。

## 2. DNS 解析建议

在火山引擎控制台进入：

```text
域名服务 -> 快捷链接 -> 云解析 DNS -> aideamatrix.com -> 记录管理 / 解析
```

添加记录：

```text
记录类型：A
主机记录：salem
记录值：<服务器公网 IP>
线路：默认
TTL：默认
```

解析完成后目标访问地址：

```text
https://salem.aideamatrix.com
```

如果用户希望主域名也访问该项目，可额外添加：

```text
记录类型：A
主机记录：@
记录值：<服务器公网 IP>
```

如果需要 `www`：

```text
记录类型：CNAME
主机记录：www
记录值：aideamatrix.com
```

## 3. 已知服务器信息

从 `/Users/reborn/Projects/龙虾部署/OPENCLAW-CONTEXT.md` 和本机 `~/.ssh/config` 可确认：

```text
服务器：火山引擎 ECS
公网 IP：115.190.232.225
系统：Ubuntu 24.04
规格：8G RAM / 40G SSD
SSH Host Alias：ecs-openclaw
SSH 用户：root
SSH 端口：22
SSH 命令：ssh ecs-openclaw
SSH 备用：ssh root@115.190.232.225
本机 SSH 私钥路径：~/.ssh/id_ed25519
```

当前本机 SSH 配置里 `ecs-openclaw` 使用代理：

```text
ProxyCommand /usr/bin/nc -X connect -x 127.0.0.1:7897 %h %p
```

注意：`OPENCLAW-CONTEXT.md` 历史记录里写过代理 `172.28.224.1:7890`，但当前 `~/.ssh/config` 中实际配置是 `127.0.0.1:7897`，以本机当前 SSH config 为准。

### 同服务器已知现有服务

从龙虾部署上下文可知，这台服务器上已有其他服务，部署 Salem 时必须避免端口和 Nginx 配置冲突：

```text
OpenClaw Gateway：127.0.0.1:18789，仅 loopback，通过 nginx 反代
IdeaMatrix：/root/mofang/ -> nginx :8800 -> Express :3002
card-server：/var/www/chat-generator/card-server/server.js -> nginx :8880 -> Node :3010
```

Salem 项目仓库里的旧 `deploy.sh` 也出现过：

```text
Access: http://115.190.232.225:18790
```

这说明此前 Salem/类似服务可能计划使用或已经占用过 `18790`。Claude Code 接手时应先只读检查端口与 Nginx：

```bash
ssh ecs-openclaw 'ss -lntp'
ssh ecs-openclaw 'nginx -T 2>/dev/null | grep -E "server_name|listen|18790|8800|8880|2567|3002|3010" -n'
ssh ecs-openclaw 'pm2 list || true'
```

## 4. 仍需向用户确认的部署权限与偏好

服务器基础连接信息已知，但 Claude Code 部署前仍应确认：

```text
是否允许安装/修改 Nginx：
是否允许安装 Node.js / npm：
是否允许安装 PM2：
是否允许申请和配置 HTTPS 证书：
是否使用宝塔 / 1Panel / 纯命令行：
是否允许把 salem.aideamatrix.com 解析到 115.190.232.225：
```

注意：不要让用户把 SSH 私钥内容、密码、API key、token 明文贴到仓库或聊天中。只需要本机私钥路径，或让用户在本机/服务器安全位置配置。

## 5. 仓库里已有但需要谨慎检查的部署文件

已有文件：

- `nginx.conf`
- `ecosystem.config.js`
- `deploy.sh`

当前状态和风险：

### `nginx.conf`

现有配置监听：

```text
listen 18790;
server_name _;
```

并把所有请求代理到：

```text
http://127.0.0.1:2567
```

这更像早期测试配置，不是最终域名 HTTPS 配置。正式部署建议改成：

```text
server_name salem.aideamatrix.com;
listen 80;
listen 443 ssl http2;
```

并配置证书。

### `ecosystem.config.js`

当前写了示例环境变量：

```text
LIVEKIT_API_KEY: "salem_api_key"
LIVEKIT_API_SECRET: "change_me_on_server"
LIVEKIT_URL: "ws://127.0.0.1:7880"
```

注意：这不是生产密钥。不要把真实密钥写入仓库。当前用户本机没有 LiveKit server，因此部署时可以先不配置 LiveKit，保持语音未配置降级。

### `deploy.sh`

当前脚本里出现：

```text
Access: http://115.190.232.225:18790
```

现在已从“龙虾部署”项目确认 `115.190.232.225` 是用户火山 ECS 服务器公网 IP。仍需在正式部署前确认是否就部署到这台服务器，以及 `18790` 是否继续用于 Salem。

## 6. 推荐生产部署结构

建议：

```text
/var/www/salem
```

或者沿用仓库脚本中的：

```text
/root/salem
```

需要根据 SSH 用户和服务器权限决定。

推荐服务结构：

```text
Nginx 443/80
  ├─ /                -> 前端静态文件 packages/client/dist
  ├─ /api             -> http://127.0.0.1:2567
  └─ WebSocket/Colyseus -> http://127.0.0.1:2567

Node/PM2
  └─ Salem server -> 127.0.0.1:2567
```

项目后端本身也能 serve 前端 dist，但生产上更推荐 Nginx 直接托管静态文件，再反代 API/WebSocket。

## 7. Nginx 方向建议

可参考目标配置思路，不要直接覆盖生产文件，先备份：

```nginx
server {
    listen 80;
    server_name salem.aideamatrix.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name salem.aideamatrix.com;

    ssl_certificate     /etc/letsencrypt/live/salem.aideamatrix.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/salem.aideamatrix.com/privkey.pem;

    root /var/www/salem/packages/client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:2567/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /colyseus/ {
        proxy_pass http://127.0.0.1:2567/colyseus/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

重要：前端当前 Colyseus 连接逻辑默认会在生产同域下使用：

```text
wss://salem.aideamatrix.com
```

如果 Nginx 只代理 `/colyseus/`，需要确认 Colyseus 客户端实际 websocket path。当前项目 `useColyseus.ts` 没有显式 path，可能直接连根路径 WebSocket。部署时要实际验证 WebSocket，如果失败，可以选择：

1. Nginx 根路径由后端统一 serve 前端和 WebSocket；或
2. 修改前端 Colyseus 客户端配置，显式使用 `/colyseus` path；或
3. Nginx 对根路径 WebSocket Upgrade 做兼容转发。

这一点需要 Claude Code 部署时重点验证。

## 8. 构建与运行命令

本地已验证：

```bash
npm run build
```

通过。

部署构建建议：

```bash
cd /var/www/salem
npm install
npm run build
```

后端运行：

```bash
cd /var/www/salem
pm2 start ecosystem.config.js --env production
pm2 save
```

或者根据实际目录修改 `ecosystem.config.js` 中的 `cwd`。

## 9. 环境变量

当前没有 LiveKit server，生产可先不配置语音：

```text
LIVEKIT_URL=
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=
```

如果后续接入 LiveKit，必须通过服务器环境变量或服务器本地 `.env` 管理，不要写入仓库。

后端默认端口：

```text
PORT=2567
```

## 10. 部署后验收清单

DNS：

```bash
dig salem.aideamatrix.com
```

健康检查：

```bash
curl -i https://salem.aideamatrix.com/api/health
```

预期返回：

```json
{"status":"ok", ...}
```

前端：

```text
https://salem.aideamatrix.com
```

游戏验证：

- 打开页面
- 创建房间
- 4 人加入
- 准备
- 开始游戏
- 黎明阶段女巫放黑猫
- 白天出牌后能结束回合
- 抽牌、黑夜、阴谋基本链路可用
- 语音显示“语音未配置”，且不阻塞游戏

## 11. 可以直接给 Claude Code 的任务描述

```text
请把 /Users/reborn/Projects/salem 部署到服务器。

域名信息：
- 主域名：aideamatrix.com
- 建议使用子域名：salem.aideamatrix.com
- DNS 平台：火山引擎云解析 DNS
- DNS 状态：正常
- 域名状态：正常
- 实名认证：已成功
- 备案：用户确认已完成
- DNS 服务器：ns1.volcengine-dns.com / ns2.volcengine-dns.com

已知服务器信息：
- 火山引擎 ECS
- 公网 IP：115.190.232.225
- 系统：Ubuntu 24.04
- 规格：8G RAM / 40G SSD
- SSH：ssh ecs-openclaw
- SSH 用户：root
- SSH 端口：22
- 本机私钥路径：~/.ssh/id_ed25519
- 当前 SSH config 使用代理：127.0.0.1:7897

同服务器已有服务，部署前必须只读检查端口和 Nginx，避免覆盖：
- OpenClaw Gateway：127.0.0.1:18789
- IdeaMatrix：/root/mofang/ -> nginx :8800 -> Express :3002
- card-server：/var/www/chat-generator/card-server/server.js -> nginx :8880 -> Node :3010

请先确认部署权限：
- 是否允许添加 DNS A 记录 salem -> 115.190.232.225
- 是否允许配置 Nginx
- 是否允许配置 HTTPS 证书
- 是否允许使用 PM2
- Salem 是否部署到 /var/www/salem 或 /root/salem

部署要求：
1. 添加 DNS A 记录：salem -> 115.190.232.225。
2. 构建前端 packages/client/dist。
3. 后端运行在 127.0.0.1:2567。
4. Nginx 配置 HTTPS，域名 salem.aideamatrix.com。
5. /api 转发到 127.0.0.1:2567。
6. Colyseus WebSocket 必须能连接，注意当前前端可能默认连 wss://host 根路径，需要实际验证 Nginx WebSocket 转发。
7. 当前没有 LiveKit server，语音保持未配置降级即可。
8. 不要把任何密钥写进代码仓库。
9. 部署后验证 /api/health、前端页面、创建房间、加入房间、开始游戏。
```
