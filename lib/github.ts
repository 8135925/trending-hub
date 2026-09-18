import {
  type Language,
  type PageSize,
  type RangeValue,
  TIME_RANGES,
} from "./constants";

/** 展示层需要的仓库字段（GitHub Search API items 子集） */
export interface RepoItem {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  homepage: string | null;
}

export interface TrendingResult {
  items: RepoItem[];
  /**
   * 数据实际拉取时间（GitHub 响应的 date 头，RFC 1123 格式）。
   * Next Data Cache 命中时保留原始响应头，因此该值即"最后更新时间"，
   * 不会因为页面重复渲染而变化。
   */
  lastUpdated: string | null;
}

interface SearchResponse {
  total_count: number;
  items?: RepoItem[];
}

const API_URL = "https://api.github.com/search/repositories";
/** fetch 级 Data Cache：30 分钟内同一筛选组合（URL 天然区分）不重复回源 */
const REVALIDATE_SECONDS = 1800;
/** 指数退避重试间隔：500ms / 1s / 2s，最多 3 次重试 */
const RETRY_DELAYS_MS = [500, 1000, 2000];

/** 进程级兜底缓存：请求彻底失败时保留上次成功结果（best-effort） */
interface FallbackEntry {
  items: RepoItem[];
  fetchedAt: string | null;
}
const lastGoodResults = new Map<string, FallbackEntry>();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function buildUrl(lang: Language, range: RangeValue, count: PageSize): string {
  const days = TIME_RANGES.find((r) => r.value === range)?.days ?? 30;
  // 日期计算在服务端完成，格式 YYYY-MM-DD
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const conditions = [`created:>${since}`];
  if (lang === "agent") {
    // AI 智能体专题：按 topic 检索（与语言筛选互斥）
    conditions.push("topic:ai-agent");
  } else if (lang !== "all") {
    conditions.push(`language:${lang}`);
  }
  const params = new URLSearchParams({
    q: conditions.join(" "),
    sort: "stars",
    order: "desc",
    per_page: String(count),
  });
  return `${API_URL}?${params.toString()}`;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };
  // 仅服务端使用，严禁加 NEXT_PUBLIC_ 前缀；未配置时降级为匿名请求
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function hasItems(data: SearchResponse): boolean {
  return data.total_count > 0 && Array.isArray(data.items) && data.items.length > 0;
}

async function requestOnce(
  url: string,
  headers: Record<string, string>,
  noStore: boolean,
): Promise<{ data: SearchResponse; fetchedAt: string | null }> {
  const init: RequestInit & { next?: { revalidate: number } } = { headers };
  if (noStore) {
    // 空结果复查专用：绕过 Data Cache，避免空列表被缓存 30 分钟
    init.cache = "no-store";
  } else {
    init.next = { revalidate: REVALIDATE_SECONDS };
  }
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`GitHub API 响应异常：HTTP ${res.status}`);
  // date 头在缓存命中时保留原始值，可作为数据拉取时间
  const fetchedAt = res.headers.get("date");
  return { data: (await res.json()) as SearchResponse, fetchedAt };
}

/**
 * 拉取近 N 天新晋高星项目榜（Top 30，按 star 降序）。
 *
 * - 请求失败：按 500ms/1s/2s 指数退避重试，仍失败则返回上次成功结果，没有则抛错（页面展示错误态）
 * - 空结果：视为异常而非有效数据，先绕过缓存复查一次；确认仍为空则返回空列表（页面展示空态，不写入任何缓存）
 */
export async function fetchTrendingRepos(
  lang: Language,
  range: RangeValue,
  count: PageSize,
): Promise<TrendingResult> {
  const url = buildUrl(lang, range, count);
  const headers = buildHeaders();
  const cacheKey = `${lang}/${range}/${count}`;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      console.log(`[github] GET ${url} (attempt ${attempt + 1})`);
      let { data, fetchedAt } = await requestOnce(url, headers, false);

      if (!hasItems(data)) {
        console.warn(`[github] 命中空结果，绕过缓存复查：${url}`);
        const fresh = await requestOnce(url, headers, true);
        if (!hasItems(fresh.data)) {
          console.warn(`[github] 复查仍为空，按空态处理（不写缓存）：${url}`);
          return { items: [], lastUpdated: null };
        }
        data = fresh.data;
        fetchedAt = fresh.fetchedAt;
      }

      const items = data.items as RepoItem[];
      lastGoodResults.set(cacheKey, { items, fetchedAt });
      return { items, lastUpdated: fetchedAt };
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_DELAYS_MS.length) {
        const delay = RETRY_DELAYS_MS[attempt];
        console.warn(
          `[github] 请求失败，${delay}ms 后重试：`,
          error instanceof Error ? error.message : error,
        );
        await sleep(delay);
      }
    }
  }

  const fallback = lastGoodResults.get(cacheKey);
  if (fallback) {
    console.warn(
      `[github] 重试均失败，降级返回上次成功结果（${fallback.items.length} 条）：${cacheKey}`,
    );
    return { items: fallback.items, lastUpdated: fallback.fetchedAt };
  }
  throw lastError instanceof Error ? lastError : new Error("GitHub API 请求失败");
}
