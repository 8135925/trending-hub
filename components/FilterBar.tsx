"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type Language,
  type RangeValue,
  LANGUAGES,
  TIME_RANGES,
} from "@/lib/constants";

const LANG_LABELS: Record<Language, string> = {
  all: "全部",
  Python: "Python",
  JavaScript: "JavaScript",
  TypeScript: "TypeScript",
  Java: "Java",
  Go: "Go",
  Rust: "Rust",
  "C++": "C++",
  C: "C",
  agent: "AI 智能体",
};

function buildHref(lang: Language, range: RangeValue): string {
  const params = new URLSearchParams({ range });
  if (lang !== "all") params.set("lang", lang);
  return `/?${params.toString()}`;
}

/**
 * 筛选栏（客户端组件）：
 * 点击 chip 立即进入等待态（spinner），导航完成后自动恢复——
 * 不依赖服务端响应何时到达，dev 模式缓冲响应时也能即时反馈。
 */
export default function FilterBar({
  lang,
  range,
}: {
  lang: Language;
  range: RangeValue;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState<string | null>(null);

  // 导航完成（URL 实际变化）后清除等待态
  useEffect(() => {
    setPending(null);
  }, [pathname, searchParams]);

  const handleNavigate = (key: string, href: string) => {
    return (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      // 目标与当前完全相同：不产生导航，也不进入等待态
      if (href === `${pathname}?${searchParams.toString()}`) return;
      setPending(key);
      router.push(href);
    };
  };

  const chipClass = (isActive: boolean, isPending: boolean) =>
    `chip${isActive ? " is-active" : ""}${isPending ? " is-pending" : ""}`;

  return (
    <nav className="filter-bar" aria-label="筛选条件">
      <div className="filter-group">
        <span className="filter-label">时间范围</span>
        <div className="filter-row">
          {TIME_RANGES.map((r) => {
            const href = buildHref(lang, r.value);
            const isPending = pending === r.value;
            return (
              <Link
                key={r.value}
                href={href}
                onClick={handleNavigate(r.value, href)}
                className={chipClass(range === r.value, isPending)}
                aria-current={range === r.value ? "page" : undefined}
              >
                {isPending ? (
                  <span className="chip-spinner" aria-hidden="true" />
                ) : (
                  r.label
                )}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="filter-group">
        <span className="filter-label">语言 / 专题</span>
        <div className="filter-row">
          {LANGUAGES.map((l) => {
            const href = buildHref(l, range);
            const isPending = pending === l;
            return (
              <Link
                key={l}
                href={href}
                onClick={handleNavigate(l, href)}
                className={chipClass(lang === l, isPending)}
                aria-current={lang === l ? "page" : undefined}
              >
                {isPending ? (
                  <span className="chip-spinner" aria-hidden="true" />
                ) : (
                  LANG_LABELS[l]
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
