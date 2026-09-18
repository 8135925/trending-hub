"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/** localStorage 中保存的精简快照（收藏时刻的数据，星数可能滞后） */
export interface FavoriteRepo {
  id: number;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  html_url: string;
  /** 收藏时刻的时间戳 */
  favorited_at: number;
}

/** 收藏时传入的字段（不含收藏时间，由内部生成） */
export type FavoriteInput = Omit<FavoriteRepo, "favorited_at">;

const STORAGE_KEY = "trending-hub:favorites";

interface FavoritesContextValue {
  favorites: FavoriteRepo[];
  /** localStorage 是否已读取完成（避免 SSR/首次渲染水合不一致） */
  hydrated: boolean;
  isFavorited: (id: number) => boolean;
  toggleFavorite: (repo: FavoriteInput) => void;
  removeFavorite: (id: number) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function isValidFavorite(value: unknown): value is FavoriteRepo {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "number" &&
    typeof v.full_name === "string" &&
    typeof v.html_url === "string" &&
    typeof v.stargazers_count === "number"
  );
}

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteRepo[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 首次挂载时读取 localStorage
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setFavorites(parsed.filter(isValidFavorite));
        }
      }
    } catch {
      // 本地数据损坏时静默忽略，按空收藏处理
    }
    setHydrated(true);
  }, []);

  // 变更后写回 localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    } catch {
      // 存储不可用（隐私模式/配额满）时静默忽略，仅影响持久化
    }
  }, [favorites, hydrated]);

  const isFavorited = useCallback(
    (id: number) => favorites.some((f) => f.id === id),
    [favorites],
  );

  const toggleFavorite = useCallback((repo: FavoriteInput) => {
    setFavorites((prev) =>
      prev.some((f) => f.id === repo.id)
        ? prev.filter((f) => f.id !== repo.id)
        : [{ ...repo, favorited_at: Date.now() }, ...prev],
    );
  }, []);

  const removeFavorite = useCallback((id: number) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const value = useMemo(
    () => ({ favorites, hydrated, isFavorited, toggleFavorite, removeFavorite }),
    [favorites, hydrated, isFavorited, toggleFavorite, removeFavorite],
  );

  return (
    <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites 必须在 <FavoritesProvider> 内使用");
  return ctx;
}
