import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { FavoritesProvider } from "@/lib/favorites";

export const metadata: Metadata = {
  title: {
    default: "Trending Hub · GitHub 新晋热门开源项目",
    template: "%s · Trending Hub",
  },
  description:
    "发现 GitHub 近段时间新晋的高星开源项目，支持按语言与时间筛选，可本地收藏。",
};

function BrandIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <path
        d="M8 22 L14 14 L18 18 L24 9"
        stroke="#fff"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 9 h-5 M24 9 v5"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {/* MD3 有机模糊形状背景（纯装饰，对辅助技术隐藏） */}
        <div className="bg-decor" aria-hidden="true">
          <span className="blob blob-a" />
          <span className="blob blob-b" />
          <span className="blob blob-c" />
        </div>
        <FavoritesProvider>
          <header className="site-header">
            <div className="container header-inner">
              <Link href="/" className="brand">
                <BrandIcon />
                Trending Hub
              </Link>
              <span className="tagline">
                GitHub 新晋热门开源项目榜单，每 30 分钟更新
              </span>
              <nav className="site-nav">
                <Link href="/favorites" className="nav-link">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
                  </svg>
                  收藏
                </Link>
              </nav>
            </div>
          </header>
          <main className="container">{children}</main>
          <footer className="site-footer">
            <div className="container">
              <p>
                数据来自 GitHub API，每 30 分钟更新；星数为抓取时刻数据，简介由大模型生成，仅供参考。
              </p>
              <p>收藏仅存于本地浏览器 · 独立演示项目，与 GitHub 无关联。</p>
            </div>
          </footer>
        </FavoritesProvider>
      </body>
    </html>
  );
}
