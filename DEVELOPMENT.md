# 开发文档

## 技术架构

```
┌─────────────────────────────────────────────────┐
│                  外部 Nginx                       │
│         (服务器已有，仅需添加配置)                   │
└──────────────────┬──────────────────────────────┘
                   │ proxy_pass :3000
┌──────────────────▼──────────────────────────────┐
│              Docker Compose                      │
│  ┌─────────────────────────────────────────┐    │
│  │  server 容器 (Node.js)                    │    │
│  │  ├── Express 静态托管前端 (./public)       │    │
│  │  ├── REST API  (/api/*)                  │    │
│  │  └── Socket.IO (/socket.io/)             │    │
│  └──────────────┬──────────────────────────┘    │
│                 │                                │
│  ┌──────────────▼──────────────────────────┐    │
│  │  postgres 容器 (PostgreSQL 16)            │    │
│  │  Volume: pgdata                          │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

单容器部署：Vite 构建前端产物 → Express 静态托管，无需额外 Web Server。

## 技术栈详情

| 层级 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端框架 | React + TypeScript | 18.x | SPA，Vite 构建 |
| 样式 | Tailwind CSS | 3.x | 暗色主题，自定义 Design Token |
| 动画 | Framer Motion | 11.x | 页面转场、印章动效、翻牌揭秘 |
| 图标 | Lucide React | — | 统一 SVG 图标，无 emoji |
| 路由 | React Router | 6.x | 客户端路由 |
| 状态管理 | Zustand | 5.x | 轻量 Store（auth、channel） |
| HTTP 客户端 | 原生 Fetch | — | 封装于 `client/src/lib/api.ts` |
| 实时通信 | Socket.IO Client | 4.x | WebSocket + 降级轮询 |
| 后端框架 | Express | 4.x | REST API |
| 实时通信 | Socket.IO Server | 4.x | 房间广播、在线状态 |
| ORM | Prisma | 6.x | 类型安全的数据库访问 |
| 数据库 | PostgreSQL | 16 | Alpine 镜像 |
| 认证 | JWT | — | Access Token (2h) + Refresh Token (7d) |
| 密码 | bcryptjs | — | 10 轮加盐哈希 |
| 校验 | Zod | 3.x | 请求体 Schema 校验 |
| 测试 | Vitest + Supertest | — | API 集成测试 |
| 容器 | Docker + Compose | — | 多阶段构建 |

## 环境准备

### 前置要求

- Node.js >= 20
- Docker & Docker Compose
- (可选) 外部 Nginx

### 安装依赖

```bash
# 后端
cd server && npm install

# 前端
cd client && npm install
```

### 环境变量

复制 `.env.example` 到 `.env`，按需修改：

```bash
cp .env.example .env
```

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 服务端口 |
| `POSTGRES_USER` | `turtle` | 数据库用户 |
| `POSTGRES_PASSWORD` | `turtle123` | 数据库密码，**生产环境必须修改** |
| `POSTGRES_DB` | `turtle_soup` | 数据库名 |
| `JWT_SECRET` | — | Access Token 签名密钥，**必须修改** |
| `JWT_REFRESH_SECRET` | — | Refresh Token 签名密钥，**必须修改** |
| `INITIAL_INVITE_CODE` | `TURTLE2024` | 首次启动自动创建的邀请码 |

## 本地开发

### 1. 启动数据库

```bash
docker compose up -d postgres
```

### 2. 配置本地数据库连接

在 `server/` 目录创建 `.env` 文件：

```
DATABASE_URL=postgresql://turtle:turtle123@localhost:5432/turtle_soup
JWT_SECRET=dev_secret_key
JWT_REFRESH_SECRET=dev_refresh_secret_key
INITIAL_INVITE_CODE=TURTLE2024
```

### 3. 数据库迁移

```bash
cd server
npx prisma migrate dev --name init
```

这会根据 `prisma/schema.prisma` 创建所有表。

### 4. 启动开发服务器

**终端 1 — 后端**（热重载）：
```bash
cd server
npm run dev          # tsx watch，监听文件变更自动重启
```

**终端 2 — 前端**（HMR）：
```bash
cd client
npm run dev          # Vite dev server :5173
```

前端 Vite 配置了代理，`/api` 和 `/socket.io` 请求自动转发到 `localhost:3000`。

### 5. Prisma 常用命令

```bash
# 查看数据库内容（可视化）
npx prisma studio

# Schema 变更后生成迁移
npx prisma migrate dev --name <描述>

# 重新生成 Prisma Client（schema 变更后）
npx prisma generate

# 重置数据库（清除所有数据）
npx prisma migrate reset
```

## 数据库设计

### ER 关系

```
User ──< ChannelMember >── Channel
User ──< Question (asker)
User ──< Question (answerer)
User ──< Rating
Channel ──< Question
Channel ──< Rating
```

### 核心模型

| 模型 | 说明 | 关键字段 |
|------|------|----------|
| `User` | 用户 | `nickname` (unique), `passwordHash`, `avatarSeed` |
| `InviteCode` | 邀请码 | `code` (unique), `maxUses` (0=无限), `usedCount` |
| `Channel` | 游戏房间 | `surface` (汤面), `truth` (汤底), `status`, `maxQuestions` |
| `ChannelMember` | 房间成员 | `role` (host/player), `becameHostAt` |
| `Question` | 问题 | `status` (pending/answered/withdrawn), `answer` (yes/no/irrelevant) |
| `Rating` | 评分 | `score` (1-5), `comment` |

### 状态流转

**Channel Status**: `active` → `ended`

**Question Status**: `pending` → `answered` / `withdrawn`

**Member Role**: `player` → `host`（查看汤底后不可逆转换）

## API 接口

### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册（昵称+密码+邀请码） | 否 |
| POST | `/api/auth/login` | 登录 | 否 |
| POST | `/api/auth/refresh` | 刷新 Token | 否 |

### 房间

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/channels` | 创建房间 | 是 |
| GET | `/api/channels` | 房间列表（支持筛选/搜索/分页） | 否 |
| GET | `/api/channels/:id` | 房间详情（汤底按角色过滤） | 是 |
| POST | `/api/channels/:id/join` | 加入房间 | 是 |
| POST | `/api/channels/:id/questions` | 提问 | 是 |
| PUT | `/api/channels/:id/questions/:qid/answer` | 回答（仅主持人） | 是 |
| PUT | `/api/channels/:id/questions/:qid/withdraw` | 撤回问题（仅提问者） | 是 |
| POST | `/api/channels/:id/reveal` | 查看汤底（变为主持人） | 是 |
| POST | `/api/channels/:id/end` | 结束游戏（仅主持人） | 是 |
| GET | `/api/channels/:id/stats` | 游戏统计 | 否 |
| POST | `/api/channels/:id/ratings` | 提交评分 | 是 |
| GET | `/api/channels/:id/ratings` | 获取评分 | 否 |

### 用户

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/users/me` | 当前用户信息 | 是 |
| GET | `/api/users/me/stats` | 个人统计 | 是 |
| GET | `/api/users/me/channels` | 参与的房间（支持 `?role=host/player`） | 是 |

### 认证机制

请求头携带 Access Token：

```
Authorization: Bearer <accessToken>
```

Token 过期后客户端自动用 Refresh Token 换取新 Token 对，期间请求会排队等待刷新完成后重试。

## WebSocket 事件

基于 Socket.IO，连接时通过 `auth.token` 传递 JWT。

### 客户端 → 服务端

| 事件 | 数据 | 说明 |
|------|------|------|
| `channel:join` | `channelId: string` | 加入房间 |
| `channel:leave` | `channelId: string` | 离开房间 |
| `question:new` | `{ channelId, question }` | 广播新问题 |
| `question:answered` | `{ channelId, question }` | 广播回答 |
| `question:withdrawn` | `{ channelId, questionId }` | 广播撤回 |
| `role:changed` | `{ channelId, userId, nickname }` | 广播身份变更 |
| `channel:ended` | `{ channelId }` | 广播游戏结束 |

### 服务端 → 客户端

| 事件 | 说明 |
|------|------|
| `channel:user_joined` | 用户加入，附带在线列表 |
| `channel:user_left` | 用户离开，附带在线列表 |
| 同名事件转发 | `question:new` / `question:answered` 等直接广播到房间 |

在线状态使用内存 Map 管理（`channelId → Map<userId, nickname>`），断线时自动清理。

## 前端架构

### 页面结构

```
App.tsx
├── Layout (顶栏 + 底部导航)
│   ├── /login          → LoginPage
│   ├── /register       → RegisterPage
│   ├── /archive        → ArchivePage (公开)
│   ├── /               → LobbyPage (需登录)
│   ├── /create         → CreatePage (需登录)
│   ├── /channel/:id    → ChannelPage (需登录)
│   └── /profile        → ProfilePage (需登录)
```

### Channel 页面组件

```
ChannelPage
├── ChannelHeader          — 顶部标题栏（sticky）
├── SurfacePanel           — 汤面展示（可折叠，折叠时显示紧凑栏）
├── SurfaceBottomSheet     — 汤面全文 Bottom Sheet（拖拽关闭）
├── ActionButtons          — 操作按钮（查看汤底、结束游戏、查看统计）
├── ChannelTabs            — 问答/讨论 Tab 切换
├── QuestionBubble         — 问题气泡（含回答选择器）
├── PlayerInputPanel       — 玩家提问输入
├── DiscussionPanel        — 讨论消息列表
├── ChatInput              — 讨论输入框
├── TruthReveal            — 汤底揭晓弹窗
├── StatsModal             — 统计数据弹窗
├── OnlineUsers            — 在线用户列表
└── ConfirmDialog          — 二次确认对话框
```

### 状态管理

**authStore** — 用户认证状态：
- `user`, `accessToken`, `refreshToken`
- `login()`, `register()`, `logout()`, `refresh()`, `loadFromStorage()`

**channelStore** — 房间游戏状态：
- `channels[]`, `currentChannel`, `questions[]`, `onlineUsers[]`, `myRole`
- `fetchChannels()`, `fetchChannel()`, `submitQuestion()`, `answerQuestion()`, `withdrawQuestion()`
- Socket 事件驱动的更新方法：`addQuestion()`, `updateQuestion()`, `removeQuestion()`, `setOnlineUsers()`

### Design Token

```
背景:       #0a0a1a (bg)
浮层:       #141432 (surface)
卡片:       #1c1c3c (card)
主色:       #7c6ff7 (primary，神秘紫)
主色亮:     #9b8fff (primary-light)
强调:       #ffd43b (accent，金色)
是:         #51cf66 (yes，翡翠绿)
否:         #ff6b6b (no，珊瑚红)
无关:       #868e96 (irrelevant，雾灰)
文字:       #e9ecef (text)
次要文字:   #adb5bd (text-muted)
边框:       #2a2a4a (border)
```

字体：标题 `Outfit`，正文 `Work Sans`（Google Fonts）。

### CSS 工具类

在 `client/src/index.css` 中定义：

| 类名 | 用途 |
|------|------|
| `.glass-card` | 毛玻璃卡片：`bg-card/60 backdrop-blur-xl border rounded-2xl` |
| `.glass-nav` | 导航栏毛玻璃 |
| `.btn-primary` | 主色按钮 |
| `.btn-ghost` | 幽灵按钮 |
| `.input-field` | 输入框 |
| `.badge` | 标签徽章 |
| `.skeleton` | 骨架屏 |
| `.safe-area-bottom` | iPhone 安全区域底部间距 |

## 测试

### 运行测试

```bash
cd server

# 确保数据库运行
docker compose up -d postgres

# 设置测试数据库 URL
export DATABASE_URL=postgresql://turtle:turtle123@localhost:5432/turtle_soup

# 运行全部测试
npm test

# 监听模式
npm run test:watch
```

### 测试覆盖范围

**auth.test.ts** — 认证流程：
- 有效/无效/用完的邀请码注册
- 昵称重复注册
- 登录、错误密码
- Token 刷新

**channel.test.ts** — 房间生命周期：
- 创建房间（创建者=创建者角色）
- 加入房间（默认=玩家）
- 结束游戏（权限校验：仅创建者）
- 列表筛选

**question.test.ts** — 核心游戏逻辑：
- 提问、pending 锁（同一玩家不能连续提问）
- 创建者和主理人不能提问
- 回答（状态流转、partial 类型、关键问题标记）
- 撤回（不计入统计）
- maxQuestions 到达自动结束
- 查看汤底 → 身份转换 + 自动撤回 pending 问题

**rating.test.ts** — 评分系统：
- 评分提交
- 评分更新
- 评分查询

**user.test.ts** — 用户接口：
- 获取当前用户
- 获取用户统计

### 关键测试场景

**角色系统测试：**
- 创建者（creator）可以结束游戏
- 主理人（host）只能回答问题，不能结束游戏
- 玩家（player）可以提问和查看汤底

**回答类型测试：**
- 支持 yes/no/irrelevant/partial 四种类型
- 关键问题标记（isKeyQuestion）仅在 yes/no 时有效
- 所有回答类型均需二次确认提交

**时间线测试：**
- 创建汤时记录 channel_created 事件
- 第一个问题时记录 first_question 事件
- 回答时记录 question_answered 事件
- 标记关键问题时记录 key_question 事件
- 查看汤底时记录 truth_revealed 和 role_changed 事件
- 结束游戏时记录 channel_ended 事件

## 构建与部署

### Docker 构建

Dockerfile 采用三阶段构建：

```
Stage 1 (client-build): npm ci → vite build → 产出 dist/
Stage 2 (server-build): npm ci → prisma generate → tsc → 产出 dist/
Stage 3 (production):   复制编译产物 + node_modules + prisma
```

最终镜像仅包含运行时所需文件，启动时自动执行 `prisma migrate deploy`。

### 部署步骤

```bash
# 1. 克隆代码
git clone <repo> && cd turtle-soup

# 2. 配置环境变量
cp .env.example .env
vim .env
# 必须修改：JWT_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD

# 3. 启动
docker compose up -d

# 4. 查看日志
docker compose logs -f server
```

### Nginx 反向代理

将 `nginx.conf.example` 的内容添加到服务器 Nginx 配置中：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端 + API
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

关键点：`/socket.io/` 必须配置 WebSocket 升级头（`Upgrade` + `Connection`），否则实时功能无法工作。

### HTTPS

在 Nginx 层配置 SSL 证书（推荐 Let's Encrypt / Certbot），应用本身不处理 HTTPS。

### 数据备份

```bash
# 导出
docker compose exec postgres pg_dump -U turtle turtle_soup > backup.sql

# 导入
docker compose exec -T postgres psql -U turtle turtle_soup < backup.sql
```

## 常见问题

**Q: 忘记邀请码？**
默认邀请码为 `TURTLE2024`（通过 `INITIAL_INVITE_CODE` 配置）。也可直接操作数据库 `InviteCode` 表新增。

**Q: WebSocket 连不上？**
检查 Nginx 配置是否包含 `/socket.io/` 的 WebSocket 升级头。浏览器控制台会显示 `polling` 降级提示。

**Q: 如何修改端口？**
修改 `.env` 中的 `PORT`，同时更新 Nginx 的 `proxy_pass` 地址。

**Q: 数据库迁移报错？**
确认 `DATABASE_URL` 正确且数据库服务已启动。可尝试 `npx prisma migrate reset` 重置（会清除数据）。
