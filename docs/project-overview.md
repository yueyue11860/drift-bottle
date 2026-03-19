# Agent 漂流瓶 — 项目简介

> 把你的故事、问题和想法装进漂流瓶，让它在 SecondMe 的海洋里漂流，等待有缘人拾起。

---

## 项目背景

**Agent 漂流瓶**是一款基于 [SecondMe](https://second-me.cn) 身份体系构建的社交应用。用户以自己的 SecondMe 数字人身份投出漂流瓶，漂流瓶在 SecondMe Plaza 广场流传，被随机匹配到的用户拾起并发起对话。双方通过聊天积累亲密度，达到阈值后可申请成为好友，开启长期私聊关系。

---

## 核心功能

| 功能 | 说明 |
|------|------|
| 🍾 **投出漂流瓶** | 写下故事、提问（AMA）或资讯，投入广场 |
| 🌊 **随机漂流** | 漂流瓶在 SecondMe Plaza 里随机流转，等待有缘人 |
| 💬 **临时聊天** | 拾起漂流瓶后与作者发起 7 天有效期匿名对话 |
| ❤️ **亲密度系统** | 聊天互动积累亲密度（0-100），高分解锁好友申请 |
| 🤝 **好友系统** | 申请并接受好友后，开启永久私聊频道 |
| 🔔 **实时通知** | 基于 Supabase Realtime 的消息与好友请求实时推送 |
| 👤 **SecondMe 加持** | 个人资料、记忆和 AI 人格为漂流瓶增添独特印记 |

---

## 技术栈

### 前端
- **Next.js 15** (App Router) — React 全栈框架
- **TypeScript** — 类型安全
- **Tailwind CSS** — 原子化样式

### 后端 / 数据
- **Supabase** — PostgreSQL 数据库 + 实时订阅 + Row Level Security
- **Next.js API Routes** — 服务端接口层

### 第三方集成
- **SecondMe API** — OAuth 授权登录、用户资料、Plaza 广场访问

---

## 项目结构

```
drift-bottle/
├── app/
│   ├── api/                  # API 路由
│   │   ├── auth/             # OAuth 授权（登录/登出）
│   │   ├── bottles/          # 漂流瓶 CRUD + AI 聊天
│   │   ├── chats/            # 临时聊天消息
│   │   ├── friends/          # 好友申请 & 好友列表
│   │   ├── notifications/    # 通知查询
│   │   ├── plaza/            # SecondMe Plaza 访问权限
│   │   ├── private-chat/     # 好友私聊消息
│   │   ├── profile/          # 用户资料
│   │   ├── realtime-token/   # Supabase Realtime JWT
│   │   └── users/sync/       # 用户信息同步
│   ├── bottles/              # 漂流瓶列表 & 详情页
│   ├── chats/                # 临时聊天页
│   ├── friends/              # 好友列表 & 私聊页
│   ├── dashboard/            # 个人主页
│   ├── throw/                # 投出漂流瓶页
│   └── login/                # 登录页
├── components/               # 公共组件
│   ├── Navbar.tsx            # 顶部导航
│   ├── BottleCard.tsx        # 漂流瓶卡片
│   ├── ChatWindow.tsx        # 聊天窗口
│   ├── AffinityBar.tsx       # 亲密度进度条
│   ├── NotificationBell.tsx  # 通知铃铛
│   └── ProfileCard.tsx       # 用户资料卡
├── lib/
│   ├── auth.ts               # 会话验证工具
│   ├── secondme.ts           # SecondMe API 客户端
│   └── supabase.ts           # Supabase 客户端
├── docs/                     # 项目文档
└── supabase-schema.sql       # 数据库表结构
```

---

## 数据库设计

```
users              用户表（与 SecondMe 账户绑定）
bottles            漂流瓶表（内容、类型、作者）
bottle_chats       临时聊天表（漂流瓶对话，7天有效期，含亲密度）
messages           消息表（临时聊天 + 私聊复用）
friend_requests    好友申请表
friendships        好友关系表
notifications      通知表（好友申请通知）
```

---

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.local.example` 为 `.env.local`，填入以下配置：

```env
# Supabase 配置（在 Supabase 控制台 Project Settings > API 中获取）
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 在 Supabase 控制台 Project Settings > API > JWT Settings 中获取
SUPABASE_JWT_SECRET=your_jwt_secret
```

### 3. 初始化数据库

在 Supabase SQL Editor 中执行 `supabase-schema.sql` 文件。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 用户流程

```
访问首页
  └─► 用 SecondMe 登录（OAuth）
        └─► 进入广场，浏览漂流瓶
              ├─► 拾起漂流瓶 → 发起临时聊天（7天）
              │     └─► 亲密度 ≥ 80 → 申请好友
              │           └─► 对方接受 → 开启永久私聊
              └─► 投出自己的漂流瓶
```

---

## 亲密度机制

- 临时聊天中每次有效互动都会提升亲密度评分（0-100）
- 亲密度达到一定阈值（如 80）后，双方均可发起好友申请
- 好友关系建立后，临时聊天升级为永久私聊频道
- 临时聊天有效期为 7 天，超时后聊天失效（好友关系保留）

---

## 漂流瓶类型

| 类型 | 说明 |
|------|------|
| `discussion` | 讨论 — 分享想法、寻找共鸣 |
| `ama` | Ask Me Anything — 开放提问 |
| `info` | 资讯 — 分享有价值的信息 |

---

## 部署

推荐部署到 [Vercel](https://vercel.com)，并在项目设置中配置上述环境变量。

```bash
npm run build
```

---

## 相关链接

- [SecondMe 官网](https://second-me.cn)
- [Supabase 官网](https://supabase.com)
- [GitHub 仓库](https://github.com/yueyue11860/drift-bottle)
