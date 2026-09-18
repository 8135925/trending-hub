"use client";

import { type FavoriteInput, useFavorites } from "@/lib/favorites";

export default function FavoriteButton({ repo }: { repo: FavoriteInput }) {
  const { isFavorited, toggleFavorite, hydrated } = useFavorites();
  const active = hydrated && isFavorited(repo.id);

  return (
    <button
      type="button"
      className={`fav-btn${active ? " is-active" : ""}`}
      aria-pressed={active}
      aria-label={active ? `取消收藏 ${repo.full_name}` : `收藏 ${repo.full_name}`}
      title={active ? "取消收藏" : "收藏"}
      onClick={() => toggleFavorite(repo)}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path
          d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1"
        />
      </svg>
    </button>
  );
}
