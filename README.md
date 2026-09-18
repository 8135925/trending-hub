# Trending Hub

发现 GitHub 上近期新晋的热门开源项目。Next.js 14（App Router）+ TypeScript + 手写 CSS，部署于 Vercel。纯只读站点 + 浏览器本地收藏，零运维成本。

## 功能

- **热门列表**：基于 GitHub Search API 的"近 N 天新晋高星项目榜"（Top 30，按 star 降序）
- **筛选**：时间范围（今日 / 本周 / 本月 / 本季 / 今年）× 语言（全部 / Python / JavaScript / TypeScript / Java / Go / Rust / C++ / C）+ AI 智能体专题（`topic:ai-agent`）+ 数量（30 / 50 / 80 / 100），URL 参数驱动（如 `/?lang=agent&range=week&count=50`），可分享
- **最后更新时间**：列表上方显示项目数与数据拉取时间（北京时间，取自 GitHub 响应 date 头，缓存命中时为原始拉取时间）
- **本地收藏**：localStorage 存精简快照，不跨设备、无账号体系
- **响应式**：桌面双列卡片 / 移动端单列
- **界面风格**：Material You（MD3）设计语言——Roboto 字体系、紫色种子色 `#6750A4`、色调分层表面、胶囊形按钮、24px 大圆角卡片、有机模糊形状背景，浅色/深色双主题跟随系统自适应

## 本地启动

要求 Node.js >= 18.17。

```bash
npm install
npm run dev
# 打开 http://localhost:3000
```

（可选）配置 GitHub Token 提升限流额度：

```bash
cp .env.example .env.local
# 编辑 .env.local，填入 GITHUB_TOKEN=你的token
```

不配置 Token 也能正常工作（匿名请求 GitHub API，限流 10 次/分钟；本站有 30 分钟数据缓存，通常足够）。

## GitHub PAT 申请指引（可选，建议配置）

配置 Token 后 API 限流从 10 次/分钟提升到 30 次/分钟：

1. 打开 GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token
2. Repository access 选择 **Public repositories**（或 No access）
3. 权限无需勾选任何一项（公开仓库数据只读即可）
4. 复制生成的 token：
   - 本地开发：填入 `.env.local` 的 `GITHUB_TOKEN=`
   - 线上部署：填入 Vercel 项目环境变量（见下）

> 注意：`GITHUB_TOKEN` 仅服务端使用，请勿加 `NEXT_PUBLIC_` 前缀，勿提交进仓库。

## 部署到 Vercel

1. 将代码 push 到 GitHub 仓库
2. 打开 [vercel.com](https://vercel.com) → **Add New Project** → 导入该仓库（Vercel 自动识别为 Next.js 项目，零配置）
3. 进入项目 **Settings → Environment Variables**，添加 `GITHUB_TOKEN`（可选但强烈建议）与 `ZHIPU_API_KEY`（可选，用于中文简介）
4. 点击 **Deploy**；之后 push 主分支自动部署，PR 自动生成预览环境

## 智谱 API Key 申请（可选，用于中文简介）

项目简介默认显示英文原文；配置免费的智谱 GLM-4-Flash 后自动提炼为中文一句话简介：

1. 打开 [bigmodel.cn](https://bigmodel.cn) → 注册
2. 右上角 **API Keys** → 创建并复制 key
3. 本地：填入 `.env.local` 的 `ZHIPU_API_KEY=`；线上：填入 Vercel 环境变量

## 技术说明

| 项 | 说明 |
|---|---|
| 数据源 | `GET /search/repositories?q=created:>YYYY-MM-DD language:X&sort=stars&order=desc&per_page=30` |
| 缓存 | fetch 级 Data Cache（`next: { revalidate: 1800 }`），同一筛选组合 30 分钟内共享缓存、不重复回源 |
| 降级 | 请求失败按 500ms / 1s / 2s 指数退避重试；仍失败返回上次成功结果；空结果视为异常、不写缓存 |
| 认证 | 服务端读取 `GITHUB_TOKEN` 注入请求头；未配置时匿名请求 |
| 收藏 | React Context + `useFavorites`，localStorage 存精简快照（星数为收藏时刻数据） |
| 简介 | 项目描述经智谱 GLM-4-Flash（免费大模型，国内直连）批量提炼为中文简介；双层缓存（进程内存 + 本地文件 `.data/summaries.json`，TTL 7 天，已加入 .gitignore），失败降级显示英文原文。需配置 `ZHIPU_API_KEY`，未配置显示英文 |

## License

MIT
