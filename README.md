# DUMB SIGNAL

## 项目简介

一个极简暗黑风格的影音内容社区，覆盖音乐（专辑乐评）、动漫、电影三个维度。项目包含沉浸式 3D 首页、可拖拽的环形封面画廊、内容详情与评论互动、后台管理以及 AI 辅助生成乐评。

项目包含：

- `dumb-frontend`：基于 Vue 3 + Vite 的前端应用
- `dumb-backend`：基于 Spring Boot 3 + MyBatis-Plus 的后端服务

## 项目结构

```
DUMB_SIGNAL_RATING/
├── dumb-frontend/                # Vue 3 + Vite 前端
│   ├── public/
│   │   ├── mock-covers/          # Mock 封面图（20 张）
│   │   ├── cineform/             # 首页 3D 模型与 HDR 环境资源
│   │   ├── videos/               # 背景视频素材
│   │   ├── audio/                # BGM 音频
│   │   └── favicon.svg
│   └── src/
│       ├── api/                  # Axios 封装 + API 函数
│       ├── assets/styles/        # 全局主题样式
│       ├── components/
│       │   ├── catalog/          # 音乐 / 动漫 / 电影共用画廊与转场
│       │   ├── common/           # 通用组件（卡片、背景、富文本编辑器等）
│       │   └── home/             # 3D 首页、加载特效与登录弹窗
│       ├── composables/          # 组合式函数（画廊交互与路由转场）
│       ├── router/               # Vue Router 路由配置
│       ├── stores/               # Pinia 状态管理（auth）
│       ├── types/                # TypeScript 类型定义
│       └── views/                # 页面视图
│           └── admin/            # 后台管理页面
├── dumb-backend/                 # Spring Boot 3 后端
│   ├── scripts/
│   │   └── run-backend.ps1      # Windows 后端启动脚本
│   ├── src/main/java/com/dumb/
│   │   ├── config/              # 配置类（安全、跨域、静态资源、AI/Last.fm 属性）
│   │   ├── controller/          # 公开接口控制器
│   │   │   └── admin/           # 后台管理接口控制器
│   │   ├── common/              # 通用类（枚举、异常、响应包装）
│   │   ├── dto/                 # 请求/响应 DTO
│   │   ├── entity/              # 数据库实体
│   │   ├── integration/         # 外部 API 集成（Last.fm）
│   │   ├── mapper/              # MyBatis-Plus Mapper
│   │   ├── security/            # JWT 认证与授权
│   │   └── service/             # 业务服务
│   └── src/main/resources/
│       ├── mapper/              # MyBatis XML 映射文件
│       └── application.yml      # 应用配置
└── README.md
```

## 技术栈

| 层级 | 技术 |
|------|------|
| **前端框架** | Vue 3 (Composition API) + TypeScript |
| **构建工具** | Vite 7 |
| **UI 组件库** | Element Plus |
| **状态管理** | Pinia |
| **路由** | Vue Router 4 |
| **HTTP 客户端** | Axios |
| **3D / 视觉效果** | Three.js |
| **CSS 预处理** | Sass |
| **后端框架** | Spring Boot 3.3 |
| **安全框架** | Spring Security + JWT (jjwt 0.12) |
| **ORM** | MyBatis-Plus 3.5 |
| **数据库** | MySQL 8 |
| **API 文档** | SpringDoc OpenAPI (Swagger UI) |
| **AI 集成** | DeepSeek (OpenAI 兼容接口) |
| **音乐数据** | Last.fm API |

## 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Java** ≥ 17（Spring Boot 3 最低要求）
- **Maven** ≥ 3.9
- **MySQL** ≥ 8

## 快速开始

### 1. 数据库

创建 MySQL 数据库：

```sql
CREATE DATABASE IF NOT EXISTS dumb DEFAULT CHARACTER SET utf8mb4;
```

启动后端后，MyBatis-Plus 会自动创建表结构。

### 2. 启动后端

```bash
cd dumb-backend
```

**方式一：直接启动**

```bash
mvn spring-boot:run
```

**方式二：使用脚本启动（Windows，推荐）**

先配置密钥文件：

```powershell
cp .env.local.example .env.local
# 编辑 .env.local，填入 AI_API_KEY 和 LASTFM_API_KEY
```

然后运行：

```powershell
.\scripts\run-backend.ps1
```

脚本会自动读取 `.env.local` 中的环境变量，并自动检测 `JAVA_HOME`。

后端默认监听 `http://localhost:8080`，Swagger 文档地址 `http://localhost:8080/swagger-ui.html`。

### 3. 启动前端

```bash
cd dumb-frontend
npm install
npm run dev
```

前端默认访问地址：`http://localhost:5173`

> 开发模式下内置 Mock 服务，无需后端即可浏览内容。Mock 数据位于 `dumb-frontend/src/mock/index.ts`。

## 环境变量

### 后端配置（`application.yml` 中可通过环境变量覆盖）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_URL` | `jdbc:mysql://localhost:3306/dumb?...` | 数据库连接 |
| `DB_USERNAME` | `root` | 数据库用户名 |
| `DB_PASSWORD` | `123456` | 数据库密码 |
| `JWT_SECRET` | `dumb-secret-key-change-in-production` | JWT 签名密钥 |
| `AI_API_KEY` | (空) | DeepSeek API Key |
| `AI_BASE_URL` | `https://api.deepseek.com` | AI 接口地址 |
| `AI_MODEL` | `deepseek-chat` | AI 模型名称 |
| `LASTFM_API_KEY` | (空) | Last.fm API Key |
| `LASTFM_ENABLED` | `true` | 是否启用 Last.fm 查询 |
| `LASTFM_AUTOCORRECT` | `true` | Last.fm 自动纠错 |

### `.env.local` 示例

```ini
# dumb-backend/.env.local（已 Git 忽略）
AI_API_KEY=sk-xxxxxxxxxxxxxxxx
LASTFM_API_KEY=xxxxxxxxxxxxxxxx
```

## 功能模块

### 前台页面

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 沉浸式 3D 场景 + 音乐/动漫/电影动态推荐 |
| `/music` | 音乐列表 | 环形封面画廊，支持长按拖拽、居中选择与跳转 |
| `/music/:id` | 乐评详情 | 专辑信息 + MV 背景 + 曲目列表 + 评论区 |
| `/anime` | 动漫列表 | 环形封面画廊，支持长按拖拽、居中选择与跳转 |
| `/anime/:id` | 动漫详情 | 全屏背景 + 详情内容 |
| `/movie` | 电影列表 | 环形封面画廊，支持长按拖拽、居中选择与跳转 |
| `/movie/:id` | 电影详情 | 全屏背景 + 详情内容 |
| `/search` | 搜索 | 跨类型全局搜索 |
| `/profile` | 个人中心 | 用户信息 |
| `/about` | 关于 | 项目介绍 |
| `/login` | 登录 | 用户登录注册 |

### 后台管理（`/admin`，需管理员/编辑权限）

- **音乐管理**：发布/编辑/删除乐评，支持 AI 辅助生成（曲目来自 Last.fm + 正文来自 DeepSeek）
- **动漫管理**：发布/编辑/删除动漫条目
- **电影管理**：发布/编辑/删除电影条目
- 支持封面上传、草稿保存（LocalStorage）、富文本编辑器

### API 接口概览

#### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/login` | 用户登录 |
| `POST` | `/api/auth/register` | 用户注册 |
| `GET` | `/api/reviews` | 乐评列表 |
| `GET` | `/api/reviews/{id}` | 乐评详情 |
| `GET` | `/api/anime` | 动漫列表 |
| `GET` | `/api/anime/{id}` | 动漫详情 |
| `GET` | `/api/movie` | 电影列表 |
| `GET` | `/api/movie/{id}` | 电影详情 |
| `GET` | `/api/comments` | 评论列表 |
| `POST` | `/api/comments` | 发表评论 |
| `DELETE` | `/api/comments/{id}` | 删除评论 |

#### 后台接口（需 JWT + ADMIN/EDITOR 角色）

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/admin/reviews` | 创建乐评 |
| `POST` | `/api/admin/reviews/ai-generate` | AI 生成乐评 |
| `PUT` | `/api/admin/reviews/{id}` | 更新乐评 |
| `DELETE` | `/api/admin/reviews/{id}` | 删除乐评 |
| `POST` | `/api/admin/anime` | 创建动漫 |
| `PUT` | `/api/admin/anime/{id}` | 更新动漫 |
| `DELETE` | `/api/admin/anime/{id}` | 删除动漫 |
| `POST` | `/api/admin/movie` | 创建电影 |
| `PUT` | `/api/admin/movie/{id}` | 更新电影 |
| `DELETE` | `/api/admin/movie/{id}` | 删除电影 |
| `POST` | `/api/admin/files/upload` | 上传封面图片 |
| `GET` | `/api/admin/reviews` | 管理端乐评列表 |
| `GET` | `/api/admin/anime` | 管理端动漫列表 |
| `GET` | `/api/admin/movie` | 管理端电影列表 |

## 数据库表

| 表名 | 说明 |
|------|------|
| `user` | 用户 |
| `album` | 音乐专辑 |
| `review` | 乐评 |
| `anime` | 动漫条目 |
| `movie` | 电影条目 |
| `comment` | 评论 |

> 表结构由 MyBatis-Plus 根据实体类自动生成（除部分通过 XML 映射的联表查询）。

## AI 生成乐评工作流

后台管理中的「AI 生成」按钮触发以下流程：

1. 用户填写**专辑名称、艺人、年份**
2. 调用 **Last.fm API** 获取官方曲目列表（作为事实锚点）
3. 将专辑信息 + 曲目作为 Prompt 发送给 **DeepSeek**（OpenAI 兼容接口）
4. 返回曲目列表、乐评正文、封面图片 URL，**自动回填表单**（不直接发布）
5. 用户可编辑确认后再手动发布

配置要求：需同时设置 `AI_API_KEY` 和 `LASTFM_API_KEY` 环境变量。

## 常见问题

### 后端启动报 Java 版本错误

错误信息包含 `class file version 61.0` 表示 Java 版本过低，需切换到 Java 17+。

### 前端接口报错

- 确认后端已启动并监听 `8080` 端口
- 确认数据库已创建且可连接
- 开发模式下前端内置 Mock，无需后端也能浏览

### 封面图不显示

- 开发模式：Mock 封面由 Vite 从 `public/mock-covers/` 直接提供
- 真实上传：封面存储在 `dumb-backend/uploads/`，后端通过 `/uploads/` 路径提供

## GitHub

仓库地址：[https://github.com/LosNadie/DUMB_SIGNAL_RATING](https://github.com/LosNadie/DUMB_SIGNAL_RATING)
