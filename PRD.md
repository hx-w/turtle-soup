# 海龟汤 (Turtle Soup) — 产品需求文档

> Situation Puzzles / Lateral Thinking Puzzles 在线游戏平台

---

## 1. 产品概述

### 1.1 产品定位

一个在线多人"海龟汤"（文字思考谜题）游戏平台。用户可以创建谜题并作为主持人引导游戏，也可以作为玩家参与他人创建的谜题。平台强调社交互动和趣味性，支持移动端优先的使用体验。

### 1.2 核心体验

- **主持人**：创建谜题，引导玩家通过 "是/否/无关" 的回答方式逐步接近真相
- **玩家**：通过提出巧妙的问题，拼凑线索，推理出谜底
- **观众**：浏览已归档的谜题，学习经典问答思路

### 1.3 术语定义

| 术语 | 含义 |
|------|------|
| 汤面 (Surface) | 谜题的表面故事，对所有人可见 |
| 汤底 (Truth) | 谜题的真相/答案，仅主持人可见 |
| Channel | 一局海龟汤游戏的完整会话 |
| 主持人 (Host) | 创建谜题或主动查看汤底的用户，负责回答问题 |
| 玩家 (Player) | 在 Channel 中提问的用户 |

---

## 2. 用户系统

### 2.1 注册

- **必填字段**：
  - 昵称（nickname）：2-16 个字符，支持中英文、数字、下划线；全局唯一，不可与已有用户重复
  - 密码：8-32 个字符，至少包含字母和数字
  - 邀请码（invite code）：必须填写有效邀请码才能完成注册
- **无需**邮箱、手机号等其他信息
- 注册成功后自动登录

### 2.2 邀请码机制

- 系统预设一批邀请码，由管理员生成
- 邀请码可设置为一次性或多次使用（含使用上限）
- 后台管理界面可以查看邀请码的使用情况
- 未来可扩展：已注册用户可生成自己的邀请码（v2）

### 2.3 登录 / 认证

- 使用昵称 + 密码登录
- 采用 JWT Token 认证，access token + refresh token 双 token 机制
- access token 有效期较短（如 2 小时），refresh token 有效期较长（如 7 天）
- 支持"记住我"选项，延长 refresh token 有效期（如 30 天）

### 2.4 用户个人中心

- **基本信息**：昵称、头像（可选，提供默认随机头像）、注册时间
- **参与记录**：
  - 主持过的海龟汤列表（含状态：进行中 / 已结束）
  - 参与过的海龟汤列表（含角色：玩家 / 主持人）
  - 提问总数 / 被回答的问题数
  - 收到的"是"/"否"/"无关"的比例统计
- **成就 / 统计**：
  - 主持场次、参与场次
  - 提问命中率（被回答"是"的比例）
  - 获得的评分统计（作为主持人时）

---

## 3. 核心功能 — 海龟汤 Channel

### 3.1 创建海龟汤

任何已登录用户均可创建新的海龟汤 Channel。

**创建时需要填写**：

| 字段 | 必填 | 说明 |
|------|------|------|
| 标题 | 是 | Channel 的名称，简短概括谜题，2-50 字符 |
| 汤面 (Surface) | 是 | 谜题的表面故事，对所有玩家可见，10-2000 字符 |
| 汤底 (Truth) | 是 | 谜题的真相/答案，仅主持人可见，10-5000 字符 |
| 最大问题数 | 否 | 可回答的问题数上限，默认无限（0 表示无限）；最小值为 10 |
| 难度标签 | 否 | 简单 / 中等 / 困难 / 地狱，默认"中等" |
| 分类标签 | 否 | 如：经典、恐怖、温情、脑洞、日常等，可多选 |

**创建后**：
- 创建者自动成为该 Channel 的初始主持人
- Channel 状态为"进行中"（Active）
- 生成一个可分享的 Channel 链接 / 邀请链接

### 3.2 Channel 状态生命周期

```
创建 → 进行中 (Active) → 结束 (Ended) → 归档 (Archived)
```

- **进行中 (Active)**：玩家可以加入、提问；主持人可以回答
- **结束 (Ended)**：
  - 触发条件（满足任一）：
    1. 已回答的问题数达到最大问题数上限
    2. 主持人手动结束 Channel
  - 结束时自动公布汤底
  - 进入评分 / 评语阶段
- **归档 (Archived)**：结束后自动归档，所有用户可浏览完整的问答记录和汤底

### 3.3 加入 Channel

- 用户点击 Channel 链接或从大厅列表进入
- 进入后默认身份为玩家
- 不需要主持人审批，自由加入
- 显示当前在线人数和已提问数 / 最大问题数

### 3.4 提问机制

**提问规则**：
1. 仅玩家身份可以提问（主持人不可提问）
2. 每个玩家同时只能有一个待回答的问题（pending question）
3. 在该问题被主持人回答之前，该玩家无法提交新问题
4. 玩家可以主动撤回已提交但尚未被回答的问题（撤回不计入问题次数）
5. 问题长度限制：5-500 字符

**提问流程**：
```
玩家提交问题 → 问题进入待回答队列 → 主持人选择问题回答 → 回答结果广播给所有人
                ↓
          玩家可撤回 (此时不计次数)
```

**问题状态**：
- `pending`：已提交，等待回答
- `answered`：已被主持人回答
- `withdrawn`：被玩家撤回

### 3.5 回答机制

**回答规则**：
1. 创建者和主理人都可以回答问题
2. 回答选项有四种：**是 (Yes)** / **否 (No)** / **无关 (Irrelevant)** / **部分正确 (Partial)**
3. 主持人从待回答队列中选择问题进行回答（非先进先出，可自由选择）
4. 每个问题只能被回答一次
5. 只有被回答的问题才计入问题次数计数

**回答交互（二次确认）**：
所有回答类型均采用统一的二次确认流程：
1. 主持人点击回答类型按钮（是/否/部分/无关）→ 按钮高亮选中
2. 选中后显示确认栏：
   - 若为「是」或「否」：显示「关键问题」toggle + 「确认回答」按钮
   - 若为「部分」或「无关」：仅显示「确认回答」按钮
3. 点击「确认回答」后提交
4. 再次点击已选中的按钮可取消选择

**关键问题标记**：
- 对于「是」或「否」的回答，可以额外标记为「关键问题」
- 关键问题表示该问题触及了汤底的核心线索
- 关键问题在 UI 中会有特殊标识（🎯）
- 「部分正确」和「无关」不能标记为关键问题

**回答后**：
- 问题状态变为 `answered`
- 回答结果附在问题上，显示回答者（@用户名）
- 已回答问题数 +1，前端更新计数器
- 若已回答问题数 = 最大问题数，触发 Channel 结束

### 3.6 三角色系统

**角色定义**：
| 角色 | 英文 | 权限 | 如何获得 |
|------|------|------|----------|
| 创建者 | `creator` | 汤面汤底所有权、结束游戏、回答问题、查看真相 | 创建汤 |
| 主理人 | `host` | 回答问题、查看真相 | 查看真相 |
| 玩家 | `player` | 提问、讨论 | 加入游戏 |

**权限矩阵**：

| 操作 | 创建者 | 主理人 | 玩家 |
|------|--------|--------|------|
| 提问 | ✗ | ✗ | ✓ |
| 回答问题 | ✓ | ✓ | ✗ |
| 查看真相 | ✓ | ✓ | ✗ |
| 结束游戏 | ✓ | ✗ | ✗ |
| 评分 | ✗ | ✗ | ✓ |
| 讨论 | ✗ | ✗ | ✓ |

**身份转换**：
- 玩家查看汤底后自动变为主理人（不是创建者）
- 创建者身份不会改变
- 一个 Channel 可以有多个主理人

### 3.7 查看汤底（身份转换）

- 任何玩家可以主动选择"查看汤底"
- 查看前需要二次确认（"确认查看汤底？查看后你将成为主理人，无法再提问"）
- 查看后：
  - 该用户看到完整的汤底内容
  - 该用户身份自动从玩家变为主理人
  - 该用户获得回答问题的能力，失去提问能力
  - 如果该用户有 pending 状态的问题，自动撤回
  - 广播通知："某用户已查看汤底，成为主理人"

### 3.8 时间线系统

**时间线事件类型**：
- `channel_created`：汤创建
- `player_joined`：玩家加入
- `first_question`：第一个问题
- `question_asked`：问题提出
- `question_answered`：问题回答
- `key_question`：关键问题
- `role_changed`：角色变更（player→host）
- `truth_revealed`：查看真相
- `channel_ended`：汤结束

**时间线展示**：
- 游戏结束后可查看完整时间线
- 归档页面可查看每局游戏的时间线
- 显示关键事件：创建时间、第一个问题、关键问题、角色变更、结束时间等

### 3.9 Channel 内实时通信

- 使用 WebSocket 实现实时通信
- 实时推送的事件：
  - 新问题提交
  - 问题被回答
  - 问题被撤回
  - 用户加入 / 离开 Channel
  - 用户查看汤底（身份变更）
  - Channel 结束
  - 问题次数更新
- 断线重连机制：自动重连 + 重连后同步最新状态

---

## 4. Channel 大厅

### 4.1 Channel 列表

- 展示所有进行中（Active）的 Channel
- 列表信息：标题、汤面摘要（前 100 字）、主持人昵称、难度、分类标签、当前参与人数、已回答问题数 / 最大问题数、创建时间
- 支持按以下维度筛选 / 排序：
  - 状态：进行中 / 已结束
  - 难度标签
  - 分类标签
  - 排序：最新创建、参与人数最多、即将结束（问题数接近上限）
- 支持关键词搜索（搜索标题和汤面内容）

### 4.2 归档 Channel 浏览

- 已结束的 Channel 可在"归档"板块浏览
- 显示完整的问答记录、汤面、汤底
- 显示评分和评语
- 支持按评分排序

---

## 5. 游戏结束后

### 5.1 汤底揭晓

- Channel 结束时，汤底自动公布给所有人
- **所有用户（包括未参与游戏的用户）均可查看已结束 Channel 的汤底**
- 展示完整的汤底内容
- 附带一个揭晓动画效果

### 5.2 统计数据

Channel 结束后展示以下统计信息：

**基础统计**：
- 总问题数（已回答的）
- 回答分布："是" 占比 / "否" 占比 / "无关" 占比（饼图展示）
- 参与玩家总数
- 主持人列表（含何时成为主持人）
- 游戏持续时间

**趣味统计**：
- "最佳侦探"：提问被回答"是"次数最多的玩家
- "南辕北辙奖"：提问被回答"否"次数最多的玩家
- "灵魂发问"：获得最多关注（如果有点赞机制）的问题
- "话痨王"：提问数最多的玩家
- "关键一问"：最后一个被回答"是"的问题及提问者
- "速通记录"：从 Channel 创建到结束的总用时
- 提问时间线：问题密度随时间变化的趋势图

### 5.3 评分与评语

- 参与过的玩家可以对该谜题进行评分：1-5 星
- 可以撰写文字评语（可选，最多 500 字）
- 评分和评语在 Channel 归档页面公开展示
- 每个用户对同一 Channel 只能评分一次（可修改）
- 主持人不能给自己的 Channel 评分

---

## 6. 实时通信设计

### 6.1 Channel 内消息类型

```typescript
enum MessageType {
  // 系统消息
  USER_JOIN = 'user_join',           // 用户加入
  USER_LEAVE = 'user_leave',         // 用户离开
  ROLE_CHANGE = 'role_change',       // 身份变更（玩家→主持人）
  CHANNEL_END = 'channel_end',       // Channel 结束

  // 游戏消息
  QUESTION_SUBMIT = 'question_submit',     // 提交问题
  QUESTION_ANSWER = 'question_answer',     // 回答问题
  QUESTION_WITHDRAW = 'question_withdraw', // 撤回问题
  COUNTER_UPDATE = 'counter_update',       // 问题计数更新
}
```

### 6.2 在线状态

- 显示 Channel 内当前在线用户列表
- 区分主持人和玩家的显示样式
- 用户离线后保留其提问和回答记录（不影响游戏进行）

---

## 7. UI / UX 设计要求

### 7.1 整体风格

- **主题**：神秘 + 趣味，使用深色系主色调配合明亮的强调色
- **配色建议**：
  - 主色：深蓝/墨绿（#1a1a2e 或 #0f3460）——营造神秘氛围
  - 强调色：琥珀色/金色（#e2b714）——用于重要交互元素
  - 回答色："是"用绿色、"否"用红色、"无关"用灰色
- **字体**：中文使用思源黑体或系统默认，英文使用 Inter 或 Poppins
- **动效**：
  - 汤底揭晓时有"掀开盖子"的动画
  - 问题被回答时有状态变化动画
  - Channel 列表使用卡片式布局，悬停有微交互
  - 适当使用 Lottie 动画增加趣味性

### 7.2 移动端适配

- **Mobile First** 设计理念
- 响应式布局，断点：
  - 移动端：< 768px
  - 平板：768px - 1024px
  - 桌面：> 1024px
- 移动端 Channel 页面使用底部 Tab 切换：问答区 / 在线用户 / 信息面板
- 手势支持：下拉刷新、滑动切换等
- **汤面常驻机制**：
  - 汤面区域可折叠为紧凑栏（44px），显示截断的汤面文字
  - 点击紧凑栏文字区域打开 Bottom Sheet 查看完整汤面
  - 点击展开按钮可内联展开汤面全文
  - Bottom Sheet 支持拖拽手势关闭（下滑 > 80px 或速度 > 500px/s）
  - 最大高度 70vh，内容可滚动，确保不遮挡底部操作区域

### 7.3 关键页面

1. **首页 / 大厅**：Channel 列表，支持筛选和搜索
2. **创建海龟汤**：表单页，填写汤面汤底等信息
3. **Channel 游戏页**：核心游戏界面
   - 顶部：Channel 标题 + 问题计数器
   - 主区域：汤面展示 + 问答时间线
   - 底部（玩家）：提问输入框
   - 底部（主持人）：待回答问题队列
4. **Channel 结束页**：统计数据 + 汤底展示 + 评分区
5. **个人中心**：用户信息 + 参与记录 + 统计数据
6. **登录 / 注册页**
7. **归档浏览页**：已结束的 Channel 详情

---

## 8. PWA 支持

### 8.1 功能要求

- 提供 `manifest.json`，支持"添加到主屏幕"
- 应用图标：多尺寸（192x192, 512x512 等）
- 启动画面（Splash Screen）
- 独立窗口模式（`display: standalone`）

### 8.2 离线能力

- Service Worker 缓存静态资源（HTML / CSS / JS / 图片）
- 离线时显示友好的离线提示页面
- 网络恢复后自动重连 WebSocket

### 8.3 推送通知（可选 v2）

- 游戏内通知：你的问题被回答了、有人加入了你的 Channel
- 后续可接入 Web Push Notification

---

## 9. 技术架构

### 9.1 技术栈建议

| 层级 | 技术选型 | 说明 |
|------|----------|------|
| 前端 | React + TypeScript | 组件化开发，类型安全 |
| UI 框架 | Tailwind CSS + shadcn/ui | 高效样式开发 + 高质量组件 |
| 状态管理 | Zustand | 轻量级状态管理 |
| 构建工具 | Vite | 快速构建和 HMR |
| 后端 | Node.js + Express/Fastify | 或 NestJS，根据偏好 |
| 数据库 | PostgreSQL | 关系型数据，适合结构化游戏数据 |
| ORM | Prisma | 类型安全的数据库操作 |
| 实时通信 | Socket.IO | WebSocket 封装，支持断线重连 |
| 缓存 | Redis | 在线状态、会话管理、实时数据 |
| 认证 | JWT (jsonwebtoken) | 无状态认证 |
| 部署 | Docker + Docker Compose | 容器化部署 |
| 反向代理 | Nginx | 静态资源服务 + WebSocket 代理 |

### 9.2 项目结构

```
turtle-soup/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
├── client/                  # 前端
│   ├── Dockerfile
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js
│   │   └── icons/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── services/       # API + WebSocket
│   │   ├── types/
│   │   └── utils/
│   └── package.json
├── server/                  # 后端
│   ├── Dockerfile
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middlewares/
│   │   ├── socket/
│   │   ├── routes/
│   │   ├── utils/
│   │   └── types/
│   └── package.json
└── PRD.md
```

### 9.3 Docker Compose 服务编排

```yaml
services:
  nginx:        # 反向代理，端口 80/443
  client:       # 前端构建产物由 nginx 托管（或独立容器 dev 模式）
  server:       # 后端 API + WebSocket 服务
  postgres:     # 数据库
  redis:        # 缓存 + 会话
```

### 9.4 数据库设计（核心表）

**User**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| nickname | VARCHAR(16) | 唯一昵称 |
| password_hash | VARCHAR | 密码哈希 |
| avatar_url | VARCHAR | 头像 URL（可选） |
| created_at | TIMESTAMP | 注册时间 |

**InviteCode**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| code | VARCHAR | 邀请码 |
| max_uses | INT | 最大使用次数 |
| used_count | INT | 已使用次数 |
| created_by | UUID | 创建者（管理员或用户） |
| created_at | TIMESTAMP | 创建时间 |

**Channel**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| title | VARCHAR(50) | 标题 |
| surface | TEXT | 汤面 |
| truth | TEXT | 汤底 |
| max_questions | INT | 最大问题数，0=无限 |
| status | ENUM | active / ended / archived |
| difficulty | ENUM | easy / medium / hard / hell |
| tags | VARCHAR[] | 分类标签数组 |
| creator_id | UUID | 创建者 |
| created_at | TIMESTAMP | 创建时间 |
| ended_at | TIMESTAMP | 结束时间（可选） |

**ChannelMember**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| channel_id | UUID | 所属 Channel |
| user_id | UUID | 用户 |
| role | ENUM | host / player |
| joined_at | TIMESTAMP | 加入时间 |
| became_host_at | TIMESTAMP | 成为主持人时间（可选） |

**Question**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| channel_id | UUID | 所属 Channel |
| asker_id | UUID | 提问者 |
| content | TEXT | 问题内容 |
| status | ENUM | pending / answered / withdrawn |
| answer | ENUM | yes / no / irrelevant / partial（可选） |
| is_key_question | BOOLEAN | 是否为关键问题 |
| answered_by | UUID | 回答者（可选） |
| created_at | TIMESTAMP | 提问时间 |
| answered_at | TIMESTAMP | 回答时间（可选） |

**TimelineEvent**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| channel_id | UUID | 所属 Channel |
| type | ENUM | 事件类型（见下表） |
| user_id | UUID | 相关用户（可选） |
| question_id | UUID | 相关问题（可选） |
| metadata | JSON | 附加信息 |
| created_at | TIMESTAMP | 事件时间 |

**EventType Enum**:
- `channel_created`：汤创建
- `player_joined`：玩家加入
- `first_question`：第一个问题
- `question_asked`：问题提出
- `question_answered`：问题回答
- `key_question`：关键问题
- `role_changed`：角色变更
- `truth_revealed`：查看真相
- `channel_ended`：汤结束

**Rating**
| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| channel_id | UUID | 所属 Channel |
| user_id | UUID | 评分用户 |
| score | INT | 1-5 星 |
| comment | TEXT | 评语（可选） |
| created_at | TIMESTAMP | 评分时间 |

---

## 10. API 设计（核心端点）

### 10.1 认证

```
POST   /api/auth/register          注册（昵称 + 密码 + 邀请码）
POST   /api/auth/login             登录
POST   /api/auth/refresh           刷新 token
POST   /api/auth/logout            登出
```

### 10.2 用户

```
GET    /api/users/me                     获取当前用户信息
PUT    /api/users/me                     更新个人信息（头像等）
GET    /api/users/me/channels            我参与的 Channel 列表
GET    /api/users/me/hosted              我主持的 Channel 列表
GET    /api/users/me/stats               我的统计数据
```

### 10.3 Channel

```
POST   /api/channels                     创建 Channel
GET    /api/channels                     获取 Channel 列表（支持筛选/分页）
GET    /api/channels/:id                 获取 Channel 详情
POST   /api/channels/:id/join            加入 Channel
POST   /api/channels/:id/end             结束 Channel（仅主持人）
GET    /api/channels/:id/questions       获取问题列表
GET    /api/channels/:id/stats           获取 Channel 统计
GET    /api/channels/:id/members         获取成员列表
```

### 10.4 问题

```
POST   /api/channels/:id/questions              提交问题
PUT    /api/channels/:id/questions/:qid/answer   回答问题（仅主持人）
PUT    /api/channels/:id/questions/:qid/withdraw 撤回问题（仅提问者）
```

### 10.5 汤底 & 评分

```
POST   /api/channels/:id/reveal          查看汤底（身份转换）
POST   /api/channels/:id/ratings         提交评分和评语
GET    /api/channels/:id/ratings         获取评分列表
```

### 10.6 管理

```
POST   /api/admin/invite-codes           生成邀请码
GET    /api/admin/invite-codes           查看邀请码列表
```

---

## 11. WebSocket 事件设计

### 11.1 客户端 → 服务端

```
channel:join          加入 Channel 房间
channel:leave         离开 Channel 房间
question:submit       提交问题
question:answer       回答问题
question:withdraw     撤回问题
truth:reveal          请求查看汤底
channel:end           结束 Channel
```

### 11.2 服务端 → 客户端

```
channel:user_joined       用户加入通知
channel:user_left         用户离开通知
channel:ended             Channel 结束通知
question:new              新问题广播
question:answered         问题已回答广播
question:withdrawn        问题已撤回广播
counter:update            问题计数更新
role:changed              用户身份变更通知
truth:revealed            汤底公布（Channel 结束时）
```

---

## 12. 安全性

- 密码使用 bcrypt 哈希存储，salt rounds >= 10
- JWT secret 通过环境变量配置，不硬编码
- 汤底内容在 API 层面严格控制：只有主持人身份的请求才返回汤底字段
- WebSocket 连接需要 JWT 认证
- 接口限流（Rate Limiting）：防止恶意刷问题
- 输入校验和 XSS 防护：所有用户输入均需转义
- CORS 配置：仅允许前端域名访问
- SQL 注入防护：使用 ORM 参数化查询

---

## 13. 部署

### 13.1 Docker Compose 一键部署

```bash
# 克隆项目
git clone <repo>
cd turtle-soup

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动所有服务
docker compose up -d
```

### 13.2 环境变量

```env
# 数据库
POSTGRES_USER=turtle
POSTGRES_PASSWORD=<secure_password>
POSTGRES_DB=turtle_soup

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=<secure_random_string>
JWT_REFRESH_SECRET=<secure_random_string>

# 应用
SERVER_PORT=3000
CLIENT_URL=http://localhost

# 初始管理员
ADMIN_NICKNAME=admin
ADMIN_PASSWORD=<admin_password>

# 初始邀请码
INITIAL_INVITE_CODE=<first_invite_code>
```

### 13.3 Nginx 配置要点

- 前端静态资源 serve
- `/api/*` 代理到后端服务
- `/socket.io/*` 代理到后端 WebSocket，配置 `Upgrade` 和 `Connection` header
- 开启 gzip 压缩
- 配置 PWA 所需的 cache 策略 header

---

## 14. 非功能性需求

| 维度 | 要求 |
|------|------|
| 性能 | Channel 内消息延迟 < 200ms；首屏加载 < 3s (4G 网络) |
| 并发 | 单 Channel 支持 100+ 同时在线用户 |
| 可用性 | WebSocket 断线自动重连，重连间隔指数退避 |
| 兼容性 | Chrome 90+, Safari 14+, Firefox 88+, Edge 90+ |
| 无障碍 | 基本的 ARIA 标签，键盘可操作 |

---

## 15. 里程碑

### v1.0 — MVP

- [x] 用户注册 / 登录（昵称 + 密码 + 邀请码）
- [x] 创建海龟汤 Channel（汤面 + 汤底 + 最大问题数）
- [x] Channel 大厅列表
- [x] 核心游戏循环：提问 → 回答（是/否/无关）→ 撤回
- [x] 查看汤底 → 身份转换
- [x] Channel 结束 + 汤底揭晓
- [x] 基础统计
- [x] 评分 / 评语
- [x] 个人中心（参与记录）
- [x] 移动端适配
- [x] PWA 支持
- [x] Docker Compose 部署

### v1.1 — 增强

- [ ] 推送通知（Web Push）
- [ ] 用户自主生成邀请码
- [x] Channel 内聊天（独立于问答的自由讨论区）
- [ ] 问题点赞 / 标记"好问题"
- [ ] 更丰富的成就系统 / 徽章

### v2.0 — 拓展

- [ ] AI 辅助出题（生成汤面 / 汤底）
- [ ] 竞赛模式（限时、积分制）
- [ ] 社交功能（关注、好友、私信）
- [ ] 汤底投票猜测（结束前玩家可提交猜测）
