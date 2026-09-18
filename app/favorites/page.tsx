"use client";

import Link from "next/link";
import RepoCard from "@/components/RepoCard";
import { useFavorites } from "@/lib/favorites";

export default function FavoritesPage() {
  const { favorites, hydrated } = useFavorites();

  return (
    <>
      <div className="page-head">
        <h1>我的收藏</h1>
        <p className="fav-note">
          共 {hydrated ? favorites.length : "…"} 个项目。数据为收藏时刻的快照（星数可能滞后），仅保存在当前浏览器，不跨设备同步。
        </p>
      </div>

      {!hydrated ? (
        <div className="state-box">
          <h2>正在读取本地收藏…</h2>
        </div>
      ) : favorites.length === 0 ? (
        <div className="state-box">
          <span className="state-icon" aria-hidden="true">
            <svg width="40" height="40" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
            </svg>
          </span>
          <h2>还没有收藏任何项目</h2>
          <p>
            去 <Link href="/">首页</Link>{" "}
            逛逛，点击卡片右上角的星形按钮即可收藏。
          </p>
        </div>
      ) : (
        <section className="repo-grid" aria-label="收藏列表">
          {favorites.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </section>
      )}
    </>
  );
}
