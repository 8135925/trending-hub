export function EmptyState() {
  return (
    <div className="state-box">
      <span className="state-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 8l9-5 9 5v8l-9 5-9-5V8z" />
          <path d="M3 8l9 5 9-5M12 13v10" />
        </svg>
      </span>
      <h2>暂无热门项目</h2>
      <p>当前筛选条件下没有符合的项目，试试切换语言或放宽时间范围。</p>
    </div>
  );
}

export function ErrorState() {
  return (
    <div className="state-box">
      <span className="state-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 3 2 20h20L12 3z" />
          <path d="M12 10v5M12 17.5v.5" strokeLinecap="round" />
        </svg>
      </span>
      <h2>加载失败</h2>
      <p>GitHub 数据暂时拉取不到，请稍后刷新重试。</p>
    </div>
  );
}
