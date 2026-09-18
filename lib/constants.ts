/** 可选语言列表，"all" 表示全部；"agent" 是专题伪语言（按 topic:ai-agent 检索 AI 智能体项目） */
export const LANGUAGES = [
  "all",
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "Go",
  "Rust",
  "C++",
  "C",
  "agent",
] as const;
export type Language = (typeof LANGUAGES)[number];

/** 时间范围：today（1 天）/ week（7 天）/ month（30 天）/ quarter（90 天）/ year（365 天） */
export const TIME_RANGES = [
  { value: "today", label: "今日", days: 1 },
  { value: "week", label: "本周", days: 7 },
  { value: "month", label: "本月", days: 30 },
  { value: "quarter", label: "本季", days: 90 },
  { value: "year", label: "今年", days: 365 },
] as const;
export type RangeValue = (typeof TIME_RANGES)[number]["value"];

export const DEFAULT_LANGUAGE: Language = "all";
export const DEFAULT_RANGE: RangeValue = "month";

/** 每页数量档位（GitHub Search API 单次上限 100） */
export const PAGE_SIZES = [30, 50, 80, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 30;

/**
 * 非法或缺失的 lang 参数一律回退默认值（all），不抛错不空查询
 */
export function normalizeLang(raw: string | string[] | undefined): Language {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (LANGUAGES as readonly string[]).includes(value ?? "")
    ? (value as Language)
    : DEFAULT_LANGUAGE;
}

/**
 * 非法或缺失的 range 参数一律回退默认值（month），不抛错不空查询
 */
export function normalizeRange(raw: string | string[] | undefined): RangeValue {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const hit = TIME_RANGES.find((r) => r.value === value);
  return hit ? hit.value : DEFAULT_RANGE;
}

/** 非法或缺失的 count 参数一律回退默认值（30） */
export function normalizeCount(raw: string | string[] | undefined): PageSize {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const num = Number.parseInt(value ?? "", 10);
  return (PAGE_SIZES as readonly number[]).includes(num)
    ? (num as PageSize)
    : DEFAULT_PAGE_SIZE;
}

/** GitHub 官方 linguist 色值（内置小映射表，覆盖筛选列表中的语言） */
export const LANGUAGE_COLORS: Record<string, string> = {
  Python: "#3572a5",
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Java: "#b07219",
  Go: "#00add8",
  Rust: "#dea584",
  "C++": "#f34b7d",
  C: "#555555",
};

export const FALLBACK_LANGUAGE_COLOR = "#8b949e";

export function languageColor(language: string | null): string {
  return (language && LANGUAGE_COLORS[language]) || FALLBACK_LANGUAGE_COLOR;
}
