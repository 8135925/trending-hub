import FavoriteButton from "./FavoriteButton";
import { languageColor } from "@/lib/constants";

/** RepoCard 需要的字段；收藏快照仅含子集，其余字段可选 */
export interface RepoCardRepo {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  forks_count?: number;
  topics?: string[];
  created_at?: string;
  homepage?: string | null;
}

function formatCount(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k >= 100 ? Math.round(k) : k.toFixed(1).replace(/\.0$/, "")}k`;
  }
  return String(n);
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function StarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
    </svg>
  );
}

function ForkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="4" cy="3" r="1.8" fill="currentColor" />
      <circle cx="12" cy="3" r="1.8" fill="currentColor" />
      <circle cx="8" cy="13" r="1.8" fill="currentColor" />
      <path
        d="M4 5v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5M8 8v3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M6 3H4a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2M9 3h4v4M13 3 8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function RepoCard({
  repo,
  translating = false,
}: {
  repo: RepoCardRepo;
  /** 等待该卡中文简介生成中（英文回退态，描述带脉动提示） */
  translating?: boolean;
}) {
  const topics = (repo.topics ?? []).slice(0, 4);

  return (
    <article className="repo-card">
      <div className="repo-head">
        <a
          className="repo-name"
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {repo.full_name}
        </a>
        <FavoriteButton
          repo={{
            id: repo.id,
            full_name: repo.full_name,
            description: repo.description,
            stargazers_count: repo.stargazers_count,
            language: repo.language,
            html_url: repo.html_url,
          }}
        />
      </div>

      <p
        className={[
          repo.description ? "repo-desc" : "repo-desc repo-desc-empty",
          translating ? "repo-desc-translating" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        title={repo.description ?? undefined}
      >
        {repo.description || "暂无描述"}
      </p>

      {topics.length > 0 && (
        <div className="repo-topics">
          {topics.map((topic) => (
            <span key={topic} className="topic">
              {topic}
            </span>
          ))}
        </div>
      )}

      <div className="repo-meta">
        {repo.language && (
          <span className="meta-item">
            <span
              className="lang-dot"
              style={{ backgroundColor: languageColor(repo.language) }}
            />
            {repo.language}
          </span>
        )}
        <span className="meta-item" title={`${repo.stargazers_count} stars`}>
          <StarIcon /> {formatCount(repo.stargazers_count)}
        </span>
        {typeof repo.forks_count === "number" && (
          <span className="meta-item" title={`${repo.forks_count} forks`}>
            <ForkIcon /> {formatCount(repo.forks_count)}
          </span>
        )}
        {repo.created_at && (
          <span className="meta-item">创建于 {formatDate(repo.created_at)}</span>
        )}
        {repo.homepage && (
          <a
            className="meta-item home-link"
            href={repo.homepage}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalIcon /> 主页
          </a>
        )}
      </div>
    </article>
  );
}
