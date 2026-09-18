/**
 * 列表骨架屏：与真实页面同构（筛选 chip + 元信息行 + 卡片网格），
 * 作为 Suspense fallback 在数据未就绪时立即显示。
 */
export function ListSkeleton() {
  return (
    <div aria-busy="true" aria-label="正在加载热门项目">
      <div aria-hidden="true">
        <div className="filter-bar">
          <div className="filter-group">
            <span className="skeleton skeleton-label" />
            <div className="filter-row">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="skeleton skeleton-chip" />
              ))}
            </div>
          </div>
          <div className="filter-group">
            <span className="skeleton skeleton-label" />
            <div className="filter-row">
              {Array.from({ length: 9 }).map((_, i) => (
                <span key={i} className="skeleton skeleton-chip" />
              ))}
            </div>
          </div>
        </div>

        <div className="skeleton skeleton-meta" />

        <div className="repo-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <span className="skeleton skeleton-title" />
              <span className="skeleton skeleton-line" />
              <span className="skeleton skeleton-line skeleton-line-short" />
              <span className="skeleton skeleton-meta-row" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
