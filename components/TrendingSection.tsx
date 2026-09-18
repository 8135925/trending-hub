import { Suspense } from "react";
import RepoCard from "./RepoCard";
import { EmptyState, ErrorState } from "./States";
import { type Language, type RangeValue } from "@/lib/constants";
import { fetchTrendingRepos, type RepoItem } from "@/lib/github";
import { summarizeOne } from "@/lib/summarize";

function formatLastUpdated(rfcDate: string | null): string {
  if (!rfcDate) return "未知";
  const date = new Date(rfcDate);
  if (Number.isNaN(date.getTime())) return rfcDate;
  const formatted = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `${formatted}（北京时间）`;
}

/** 单卡：等待该条的中文简介，完成前外层 Suspense 显示英文回退卡 */
async function SummarizedCard({ repo }: { repo: RepoItem }) {
  const summary = await summarizeOne(repo.description);
  return <RepoCard repo={summary ? { ...repo, description: summary } : repo} />;
}

/**
 * 榜单内容区（服务端流式渲染）：
 * 1. GitHub 拉取（快）未完成 → 外层骨架屏
 * 2. 大模型总结（慢）未完成 → 先流式输出英文卡片 + "生成中"提示，完成后无缝替换
 */
export default async function TrendingSection({
  lang,
  range,
}: {
  lang: Language;
  range: RangeValue;
}) {
  let items: RepoItem[] = [];
  let lastUpdated: string | null = null;
  try {
    const result = await fetchTrendingRepos(lang, range);
    items = result.items;
    lastUpdated = result.lastUpdated;
  } catch (error) {
    console.error("[home] 拉取热门项目失败：", error);
    return <ErrorState />;
  }

  if (items.length === 0) return <EmptyState />;

  return (
    <>
      <div className="list-meta">
        共 {items.length} 个项目 · 数据来自 GitHub Search API，每 30 分钟更新，
        最后更新：{formatLastUpdated(lastUpdated)}
      </div>
      <div className="repo-grid" aria-label="热门项目列表">
        {items.map((repo) => (
          <Suspense key={repo.id} fallback={<RepoCard repo={repo} translating />}>
            <SummarizedCard repo={repo} />
          </Suspense>
        ))}
      </div>
    </>
  );
}
