"use client";

import { useEffect, useState } from "react";

/** 右下角"回到顶部"火箭按钮：滚动超过 400px 后浮现，点击平滑回顶 */
export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      className={`back-to-top${visible ? " is-visible" : ""}`}
      onClick={scrollToTop}
      aria-label="回到顶部"
      title="回到顶部"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path
          d="M12 2C15 4 16.5 7.5 16.5 11L14 14H10L7.5 11C7.5 7.5 9 4 12 2Z"
          fill="currentColor"
        />
        <circle cx="12" cy="8.5" r="1.7" fill="var(--tertiary)" />
        <path d="M7.5 11L5 14.5L8.2 13.6Z" fill="currentColor" />
        <path d="M16.5 11L19 14.5L15.8 13.6Z" fill="currentColor" />
        <path d="M11 14.8H13L12 18.5Z" fill="currentColor" />
      </svg>
    </button>
  );
}
