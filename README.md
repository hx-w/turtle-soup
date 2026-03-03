# 🐢 海龟汤 — Lateral Thinking Puzzles Online

> 一碗汤，一个谜，无数次灵魂拷问。

海龟汤是一个在线横向思维推理游戏平台。主持人抛出一个离奇的「汤面」，玩家只能通过**是/否/无关**三种回答来层层剥茧，最终揭开隐藏在水面下的真相——「汤底」。

## 这是什么游戏？

还记得那个经典的谜题吗？

> **汤面：** 一个男人走进餐厅，点了一碗海龟汤。他喝了一口，然后走出餐厅，自杀了。为什么？

玩家不断提问，主持人只回答「是」「否」「无关」。在一次次的否定和肯定之间，真相逐渐浮出水面。

## 核心玩法

```
主持人创建房间 → 写下汤面和汤底
     ↓
玩家加入房间 → 阅读汤面
     ↓
玩家提问 → 主持人回答 是 / 否 / 无关
     ↓
  (循环往复，层层推理)
     ↓
揭晓汤底 → 统计战绩 → 评分
```

**身份转换机制**：好奇心太强忍不住偷看答案？没关系——你会自动变成主持人，从「猜谜者」变成「守秘者」。

## 特色功能

- **实时对战** — WebSocket 驱动，问答即时同步
- **身份流转** — 玩家可随时查看汤底，代价是变成主持人
- **讨论区** — 独立于问答的自由讨论频道，不影响游戏进程
- **趣味统计** — 最佳侦探、话痨王、南辕北辙王...每局都有颁奖典礼
- **暗夜主题** — 深邃的夜空配色，神秘紫 + 金色高光，适合推理氛围
- **移动优先** — 手机上也能流畅推理，支持 PWA 安装，汤面常驻可随时查看
- **邀请码注册** — 小圈子玩法，和朋友们一起烧脑

## 快速开始

### Docker 一键部署

```bash
cp .env.example .env
# 编辑 .env，修改 JWT_SECRET 和数据库密码

docker compose up -d
```

访问 `http://localhost:3000`，使用邀请码 `TURTLE2024` 注册第一个账号。

### 配合外部 Nginx

如果服务器已有 Nginx，参考 `nginx.conf.example` 配置反向代理（注意 WebSocket 升级头）。

## 技术栈

| 前端 | 后端 | 基础设施 |
|------|------|----------|
| React 18 + TypeScript | Node.js + Express | PostgreSQL 16 |
| Tailwind CSS + Framer Motion | Socket.IO | Prisma ORM |
| Zustand + React Router v6 | JWT 双 Token 认证 | Docker Compose |
| Vite | Zod 校验 | PWA |

## 项目结构

```
turtle-soup/
├── client/          # React 前端
│   ├── src/pages/   # 7 个页面（登录/注册/大厅/创建/游戏/档案/我的）
│   ├── src/components/  # UI 组件（含 channel 子目录）
│   └── src/stores/  # Zustand 状态管理
├── server/          # Express 后端
│   ├── src/routes/  # RESTful API
│   ├── src/socket.ts  # WebSocket 事件
│   ├── prisma/      # 数据库 Schema
│   └── tests/       # API 测试
├── docker-compose.yml
├── Dockerfile       # 多阶段构建
└── nginx.conf.example
```

## 开发

```bash
# 安装依赖
cd server && npm install
cd ../client && npm install

# 启动数据库
docker compose up -d postgres

# 数据库迁移
cd server && npx prisma migrate dev --name init

# 启动开发服务器（分别在两个终端）
cd server && npm run dev     # :3000
cd client && npm run dev     # :5173 (代理到 3000)
```

详细开发指南请参阅 [DEVELOPMENT.md](./DEVELOPMENT.md)。

## License

MIT
