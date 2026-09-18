import { Suspense } from "react";
import FilterBar from "@/components/FilterBar";
import { ListSkeleton } from "@/components/ListSkeleton";
import TrendingSection from "@/components/TrendingSection";
import { normalizeCount, normalizeLang, normalizeRange } from "@/lib/constants";

interface HomePageProps {
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function HomePage({ searchParams }: HomePageProps) {
  // 非法或缺失的参数在 normalize 内回退默认值（all / month），不抛错不空查询
  const params = searchParams ?? {};
  const lang = normalizeLang(params.lang);
  const range = normalizeRange(params.range);
  const count = normalizeCount(params.count);

  // 筛选栏立即渲染；榜单数据在 Suspense 内流式加载（未就绪时显示骨架屏，
  // GitHub 数据到达后先显示英文卡片，总结完成后逐张替换为中文）
  return (
    <>
      <FilterBar lang={lang} range={range} count={count} />
      <Suspense fallback={<ListSkeleton />}>
        <TrendingSection lang={lang} range={range} count={count} />
      </Suspense>
    </>
  );
}
