# Trending Hub 需求说明书

> GitHub 热门项目分享站 · 部署于 Vercel
> 本文档是唯一需求来源，开发时以此为准。

## 1. 项目概述

一个聚合展示 GitHub 热门开源项目的网站，支持按语言和时间维度筛选，提供本地收藏能力（纯只读站点 + localStorage 收藏，无任何服务端写入）。目标是快速上线、零运维成本，同时作为 Next.js + Vercel 全链路的实践项目。

## 2. 技术栈（约束，不可替换）

| 项 | 选择 | 说明 |
|---|---|---|
| 框架 | Next.js 14.x（App Router） | 必须用 App Router，不用 Pages Router |
| 语言 | TypeScript | 严格模式 |
| 样式 | 手写 CSS（禁用 Tailwind） | 全局 CSS + CSS 变量，克制工程风 |
| 部署 | Vercel Hobby 免费版 | 不引入需要自建服务器的组件 |
| 外部依赖 | 仅 next / react / react-dom + @types | 纯只读站点，无外部存储、无 SDK |

## 3. 数据层设计

### 3.1 数据源

GitHub 官方 REST API 的 Search 端点（官方无 trending 端点，此为标准变通方案）：

```
GET https://api.github.com/search/repositories
  ?q=created:>{N天前} language:{lang}
  &sort=stars&order=desc&per_page=30
```

- 语义：**近 N 天新晋高星项目榜**（非官方 trending 的短期涨星速度，可接受）
- 时间范围参数：`week`（7 天）/ `month`（30 天）/ `year`（365 天）
- 语言筛选：全部 / Python / JavaScript / TypeScript / Java / Go / Rust / C++ / C
- 日期计算在服务端完成，`created:>YYYY-MM-DD` 格式

### 3.2 字段映射（RepoCard 需要的字段）

| 展示字段 | API 字段 |
|---|---|
| 名称 / 作者 | `full_name` |
| 描述 | `description` |
| 星数 | `stargazers_count` |
| Fork 数 | `forks_count` |
| 语言 + 色点 | `language`（颜色用 GitHub 官方 linguist 色值映射，内置一份小映射表即可） |
| Topics | `topics`（最多展示 4 个） |
| 创建时间 | `created_at` |
| 仓库链接 | `html_url` |
| 首页 | `homepage`（可选展示） |

### 3.3 缓存与限流（关键）

- **缓存层级必须是 fetch 级 Data Cache，不是页面级 ISR**：`fetch(url, { next: { revalidate: 1800 } })`。原因：首页读取 searchParams 做筛选，该页面在 App Router 中为动态渲染，页面级 `export const revalidate` 对其不生效，只有 fetch 级缓存能保证 30 分钟内不重复回源
- 缓存 Key 天然按筛选组合区分（不同 `lang × range` 的 URL 不同），同一组合 30 分钟内所有访客共享缓存
- 认证：读取环境变量 `GITHUB_TOKEN`（fine-grained PAT，public repo 只读），未配置时降级为匿名请求并正常工作。**仅服务端使用，严禁加 `NEXT_PUBLIC_` 前缀**
- 匿名限流 10 次/分钟、认证 30 次/分钟，30 分钟缓存下均够用（即使访客玩遍全部筛选组合，回源频率也远低于阈值）
- fetch 需携带 `Accept: application/vnd.github+json` 头
- 请求失败按指数退避重试：500ms / 1s / 2s，最多 3 次，仍失败则保留上次结果并打日志，不要整页报错
- 空结果（`total_count=0` 且 items 为空）视为异常而非有效数据，不写入缓存，避免空列表被缓存 30 分钟

## 4. 页面与路由

| 路由 | 类型 | 职责 |
|---|---|---|
| `/` | 服务端组件 | 热门列表 + 筛选。筛选通过 searchParams：`/?lang=python&range=month`，用 `<Link>` 切换，不写客户端状态。**非法或缺失的 `lang`/`range` 参数一律回退默认值（all / month），不抛错不空查询** |
| `/favorites` | 客户端组件 | 收藏列表，读 localStorage 渲染，空态有引导文案 |

全站仅此两个路由，无 API Route（无服务端写入需求）。

### 4.1 首页布局

- 顶部：站名 + 一句话简介 + 收藏页入口
- 筛选栏：时间范围（本周/本月/今年）+ 语言两行 chip，当前项高亮
- 列表：RepoCard 依次排列，信息密度克制，不堆动效
- 底部：数据说明（"数据来自 GitHub Search API，每 30 分钟更新"）+ 免责说明

## 5. 功能需求

### P0（M1，先上线）

- [ ] 首页热门列表（服务端渲染，数据经 fetch 级缓存 1800s，见 3.3）
- [ ] 语言 × 时间范围筛选（searchParams 驱动，非法参数回退默认值）
- [ ] RepoCard 完整信息展示
- [ ] GitHub API 封装 `lib/github.ts`（含 token 注入、错误降级）
- [ ] 首页空态与错误态：数据为空时展示友好空态文案；请求彻底失败（且无上次结果）时展示错误态 + "稍后重试"提示，不允许白屏
- [ ] 响应式：桌面双列卡片 / 移动端单列

### P1（M2）

- [ ] 收藏功能：localStorage 存精简快照（id / full_name / description / stargazers_count / language / html_url / 收藏时间）
  - React Context + 自定义 hook（`useFavorites`）
  - RepoCard 上星形按钮切换，收藏页同步展示
  - 不做账号体系，明确接受不跨设备
- [ ] 收藏页 `/favorites`：支持取消收藏、跳转原仓库
- [ ] 收藏展示**收藏时刻的快照数据**（星数可能滞后），页面上注明"数据为收藏时快照"，不做刷新——刷新属 scope 外

P1 完成即项目终点，无 P2。

## 6. 环境变量清单

| 变量 | 必填 | 用途 |
|---|---|---|
| `GITHUB_TOKEN` | 建议 | GitHub PAT，提升 API 限流额度 |

仅此一个环境变量。`.env.local` 本地开发用，`.env.example` 提交进仓库作为模板。

## 7. 部署要求（Vercel）

1. `vercel build` 必须零报错；标准 Next.js 项目，Vercel 自动识别
2. Vercel 项目 Settings → Environment Variables 配置 `GITHUB_TOKEN`（可选但强烈建议）
3. push 到 GitHub 主分支自动部署，PR 出预览环境
4. README.md 写清：本地启动步骤、GitHub PAT 申请指引、Vercel 导入步骤

## 8. 验收标准

- [ ] 首页默认展示近 30 天全部语言热门项目 30 条
- [ ] 切换语言/时间筛选，URL 同步变化且可分享
- [ ] 缓存生效：30 分钟内同一筛选组合重复访问不产生新的 GitHub API 请求（`lib/github.ts` 打请求日志，或对比响应 `x-ratelimit-remaining` 递减情况确认）
- [ ] 非法参数（`/?lang=xxx&range=yyy`）回退默认值正常渲染，不 500
- [ ] 断网 / API 全挂时展示错误态而非白屏
- [ ] 收藏、取消收藏、收藏页展示全流程可用
- [ ] 移动端 375px 宽度下无横向滚动
- [ ] Lighthouse 性能分 ≥ 90（首屏服务端直出应轻松达标）

## 9. 明确不做（scope 外）

- 账号体系 / 跨设备收藏同步
- **点赞功能（已封存）**：如需恢复，最小实现路径为——新增 `/api/likes` 路由（GET 按 ids 批量查计数、POST 自增），存储用 Upstash Redis（免费层，原生 fetch 调 REST 零 SDK），前端 localStorage 记录已点赞 repoId 防重复；SSR 不注入点赞数，客户端水合后批量拉取
- 抓取 github.com/trending 页面（官方曾传下线，长期风险高）
- README 详情页、评论、分享卡片（二期再议）
- 严格防刷（限流、指纹）
- 分页 / 加载更多（首版固定 30 条，翻页等有真实需求再说）
- 收藏数据刷新（快照即终态）

## 10. 可参考项目

| 项目 | 参考点 |
|---|---|
| cuxt/next-daily-hot | 仅参考设计细节（指数退避重试、空数据降级，已并入 3.3 节）。**注意：其架构（Next 16 + React 19 + HeroUI + Tailwind + zustand）与本需求约束不兼容，禁止照搬其架构与依赖** |
| Ibook000/GithubTrending | 功能形态、中文产品细节（收藏、榜单切换） |
| bestofjs.org | 卡片信息密度与克制风格 |

> 开发时不需要 clone 以上项目。遇到具体实现疑问时在 GitHub 网页上按需查阅对应文件即可，避免参考代码干扰架构约束。

---

需求版本：v1.2（2026-09-18，砍掉点赞功能：删 P2、`/api/likes` 路由、Upstash 环境变量及全部相关验收；保留 localStorage 收藏。P1 即项目终点，全站纯只读 + 本地收藏，无服务端写入）
