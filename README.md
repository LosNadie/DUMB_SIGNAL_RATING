# DUMB SIGNAL

极简暗黑风格的影音内容社区：专辑乐评、动漫与电影。

本站由 Next.js 15（App Router）全栈实现 —— 所有公开页面服务端渲染，内容对搜索引擎完全可见；后端原 Spring Boot
服务已由 Prisma + PostgreSQL 取代，同一仓库、同一部署单元。

## 特性

- **SEO 优先**：详情页输出真实正文、动态 `title` / `description` / canonical / OG 图、`schema.org` 结构化数据
  （`Review` + `MusicAlbum` / `TVSeries` / `Movie` + `BreadcrumbList`），自动生成 `sitemap.xml` 与 `robots.txt`
- **可抓取的筛选**：列表筛选、排序、分页全部进入 URL（`/music?genre=post-rock&sort=score&page=2`），无 JS 也可用
- **三类内容**：音乐乐评（含曲目表与 MV 链接）、动漫、电影，统一的评论与评分
- **AI 辅助写作**：Last.fm / AniList / TMDB 元数据 + DeepSeek 生成草稿，未配置密钥时功能降级而站点不受影响
- **自托管部署**：多阶段 Docker 构建 + docker compose（app + postgres + 一次性迁移）
- **无 3D 依赖**：旧版首页的 Three.js 场景（约 29MB 资源）已移除，改为静态视觉 + CSS 动效，首屏显著更快

## 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 15.5（App Router、RSC、Server Actions） |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui 风格组件 + lucide-react |
| 编辑器 | TipTap v3（写入与渲染双重 `sanitize-html`） |
| 数据库 | PostgreSQL 16 + Prisma 6（`pg_trgm` 索引支撑中文搜索） |
| 认证 | 自研 JWT（`jose`，HS256）+ httpOnly Cookie；middleware + 服务层双重校验 |
| 图片 | `next/image` + `sharp`（上传压缩为 WebP） |
| 集成 | DeepSeek（OpenAI 兼容）、Last.fm、AniList、TMDB |
| 测试 | Vitest（单元）+ Playwright（端到端） |

## 快速开始

```bash
pnpm install
cp .env.example .env          # 至少设置 DATABASE_URL 与 AUTH_SECRET
pnpm db:migrate               # 应用迁移
pnpm db:seed                  # 播种风格目录、管理员与示例内容
pnpm dev                      # http://localhost:3000
```

默认管理员账号来自 `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD`（默认 `admin` / `admin123`，生产环境务必修改）。

### 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `DATABASE_URL` | 是 | PostgreSQL 连接串 |
| `AUTH_SECRET` | 是 | JWT 签名密钥（≥32 字符） |
| `NEXT_PUBLIC_SITE_URL` | | 站点外网地址，用于 canonical / sitemap / OG |
| `UPLOAD_DIR` | | 上传目录（默认 `public/uploads`） |
| `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` | | AI 辅助写作 |
| `LASTFM_API_KEY` | | 乐评曲目数据 |
| `TMDB_API_KEY` | | 电影元数据 |

密钥缺失时相关功能返回明确错误，站点其余功能正常。

## Docker 部署

```bash
# .env 中设置 POSTGRES_PASSWORD 与 AUTH_SECRET
docker compose up -d --build
```

`docker compose` 会启动 postgres、执行一次性迁移（`migrate` 服务）、启动应用，上传文件保存在 `uploads` 卷中。

## 从旧版迁移

旧站使用 Vue 3 + Spring Boot + MySQL。数据迁移脚本在 `scripts/` 下：

```bash
# 1. 从 MySQL 导出快照（只读，不修改源库）
pnpm legacy:export

# 2. 预演：核对报告，不写库
pnpm legacy:import --dry-run

# 3. 正式导入
pnpm legacy:import --legacy-uploads=/path/to/dumb-backend/uploads

# 4. 校验迁移结果
npx tsx scripts/verify-migration.ts
```

导入会解析旧版正文中的 `风格：/ 年份：/ 曲目：/ 背景：` 行并转为结构化字段，按 `(artist, title)` 合并重复专辑，
上传图片复制到新的 `UPLOAD_DIR`。已导入内容的 slug 带旧库 id 后缀（如 `/music/oklou-choke-enough-10`），
旧数字链接 `/music/7` 会 308 跳转到新 slug。

> 迁移后请重跑 `pnpm db:seed` —— 旧库密码哈希无法反推，seed 会把管理员密码重置为已知值。

## 目录结构

```
prisma/            schema、迁移、种子
scripts/           旧数据导出 / 导入 / 校验
src/
├── app/           路由（公开页、后台、API）
│   ├── (site)/    站点页面
│   ├── admin/     后台管理
│   └── api/       Route Handlers（AI、上传、浏览量、健康检查）
├── actions/       Server Actions（认证、评论、内容保存）
├── components/    UI 组件
├── lib/           数据访问、SEO、认证、集成客户端
└── types/         客户端安全类型
tests/
├── unit/          Vitest
└── e2e/           Playwright
```

## 常用命令

```bash
pnpm dev            # 开发服务器（Turbopack）
pnpm build          # 生产构建
pnpm typecheck      # TypeScript
pnpm lint           # ESLint
pnpm test:unit      # Vitest
pnpm test:e2e       # Playwright（复用已运行的服务器）
pnpm db:studio      # Prisma Studio
```

## SEO 检查

```bash
curl -s localhost:3000/music/1 | grep -o '<title>[^<]*'      # 标题含专辑名与艺人
curl -s localhost:3000/music/1 | grep -c 'ld+json'           # 结构化数据
curl -s localhost:3000/sitemap.xml | grep -c '<loc>'         # sitemap 覆盖率
curl -s localhost:3000/robots.txt
```

## 致谢

早期首页使用以下 Sketchfab 3D 资源，现已移除，署名保留：

- [Scifi Girl v.01](https://sketchfab.com/3d-models/scifi-girl-v01-96340701c2ed4d37851c7d9109eee9c0) by patrix —
  [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- [Modern VR Art Gallery Pyramid](https://sketchfab.com/3d-models/modern-vr-art-gallery-pyramid-c43438ef93dd406d93c3ade933e739ec)
  by Maxim Mavrichev — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
