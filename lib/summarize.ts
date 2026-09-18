/**
 * 项目简介：智谱 GLM-4-Flash 逐条总结（每条描述一次请求）
 * - 渐进呈现：每张卡片独立总结、独立流式替换（英文回退 → 中文）
 * - 限流防护：共享队列，并发 2 + 间隔 300ms
 * - 缓存：进程 Map + 本地文件 .data/summaries.json（TTL 7 天，写盘防抖）
 * - 降级：未配置 key / 失败 / 熔断 → null（显示英文）；失败不写缓存，下次重试
 * - 熔断：连续失败 5 条暂停 10 分钟
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
const DEFAULT_MODEL = "glm-4-flash";
const MAX_TEXT_LENGTH = 300;
const TIMEOUT_MS = 20_000;
const RETRY_DELAYS_MS = [1500];
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_CONCURRENT = 2;
const REQUEST_GAP_MS = 300;
const CACHE_FILE = path.join(process.cwd(), ".data", "summaries.json");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let consecutiveFailures = 0;
let circuitOpenUntil = 0;
let noKeyWarned = false;

interface CacheEntry {
  summary: string;
  expiry: number;
}

const summaryCache = new Map<string, CacheEntry>();
let fileCacheLoaded = false;

async function loadFileCache(): Promise<void> {
  if (fileCacheLoaded) return;
  fileCacheLoaded = true;
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      for (const [text, entry] of Object.entries(parsed as Record<string, unknown>)) {
        const e = entry as { summary?: unknown; expiry?: unknown };
        if (
          typeof e.summary === "string" &&
          e.summary &&
          typeof e.expiry === "number" &&
          e.expiry > Date.now()
        ) {
          summaryCache.set(text, { summary: e.summary, expiry: e.expiry });
        }
      }
    }
    console.log(`[summarize] 已从本地缓存文件加载 ${summaryCache.size} 条简介`);
  } catch {
    // 文件不存在或损坏：按空缓存处理
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void saveFileCache();
  }, 1000);
}

async function saveFileCache(): Promise<void> {
  try {
    const now = Date.now();
    const persistable: Record<string, CacheEntry> = {};
    for (const [text, entry] of summaryCache) {
      if (entry.expiry > now) persistable[text] = entry;
    }
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    const tmp = `${CACHE_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(persistable), "utf8");
    await fs.rename(tmp, CACHE_FILE);
  } catch {
    // 只读文件系统（Vercel）或磁盘异常：降级为纯进程内缓存
  }
}

function isMostlyChinese(text: string): boolean {
  let cjk = 0;
  let total = 0;
  for (const ch of text) {
    if (/\s/.test(ch)) continue;
    total++;
    if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(ch)) cjk++;
  }
  return total > 0 && cjk / total >= 0.2;
}

function getCached(text: string): CacheEntry | null {
  const hit = summaryCache.get(text);
  return hit && hit.expiry > Date.now() ? hit : null;
}

function extractSummary(content: string): string | null {
  const start = content.indexOf("[");
  const end = content.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(content.slice(start, end + 1));
    if (!Array.isArray(parsed)) return null;
    for (const item of parsed) {
      if (typeof item === "object" && item !== null) {
        const { summary } = item as { summary?: unknown };
        if (typeof summary === "string" && summary.trim()) return summary.trim();
      }
    }
  } catch {
    // 忽略解析错误
  }
  return null;
}

interface ChatResponse {
  choices?: { message?: { content?: unknown } }[];
}

async function callLlm(text: string): Promise<string> {
  const body = {
    model: process.env.ZHIPU_MODEL || DEFAULT_MODEL,
    temperature: 0.3,
    max_tokens: 512,
    messages: [
      {
        role: "system",
        content:
          "你是开源项目榜单的简介编辑，负责把英文项目描述提炼为简洁准确的中文一句话简介。只输出 JSON，不要输出任何解释。",
      },
      {
        role: "user",
        content: [
          "请把这条 GitHub 项目描述提炼为中文简介，要求：",
          "- 长度 30 到 60 字：过短则补充说明项目解决什么问题，过长则提炼要点",
          "- 保留项目名、专有名词与关键技术",
          "- 英文需翻译；信息不足时如实概括，禁止编造",
          '- 只输出 JSON 数组，形如 [{"id":1,"summary":"..."}]',
          "",
          `1. ${text.slice(0, MAX_TEXT_LENGTH)}`,
        ].join("\n"),
      },
    ],
  };

  console.log(`[summarize] 请求报文 → POST ${ENDPOINT}`);
  console.log(JSON.stringify(body, null, 2));

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ZHIPU_API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const raw = await res.text();
  console.log(`[summarize] 响应报文 ← HTTP ${res.status}`);
  console.log(raw);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let data: ChatResponse;
  try {
    data = JSON.parse(raw) as ChatResponse;
  } catch {
    throw new Error(`响应不是 JSON：${raw.slice(0, 200)}`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content) throw new Error("响应缺少 content");
  return content;
}

/* ---------- 共享任务队列（限并发 + 间隔） ---------- */

type Task = () => Promise<void>;
const queue: Task[] = [];
let activeWorkers = 0;

function pump(): void {
  while (activeWorkers < MAX_CONCURRENT && queue.length > 0) {
    const task = queue.shift();
    if (!task) break;
    activeWorkers++;
    void (async () => {
      try {
        await task();
      } finally {
        activeWorkers--;
        pump();
      }
    })();
  }
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    queue.push(async () => {
      try {
        resolve(await fn());
      } catch (error) {
        reject(error);
      }
    });
    pump();
  });
}

function isCircuitOpen(): boolean {
  return Date.now() < circuitOpenUntil;
}

function recordFailure(): void {
  consecutiveFailures++;
  if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    consecutiveFailures = 0;
    console.warn(
      `[summarize] 连续失败达到阈值，熔断 ${CIRCUIT_COOLDOWN_MS / 60000} 分钟（期间直接显示英文原文）`,
    );
  }
}

/**
 * 总结单条描述。返回中文简介；原文已是中文时原样返回；
 * 未配置 key / 无描述 / 失败 / 熔断中 → 返回 null（调用方显示英文原文）。
 */
export async function summarizeOne(text: string | null): Promise<string | null> {
  if (!process.env.ZHIPU_API_KEY) {
    if (!noKeyWarned) {
      console.warn("[summarize] 未配置 ZHIPU_API_KEY，跳过大模型简介（显示英文原文）");
      noKeyWarned = true;
    }
    return null;
  }
  if (!text) return null;
  if (isMostlyChinese(text)) return text;

  await loadFileCache();
  const cached = getCached(text);
  if (cached) return cached.summary;
  if (isCircuitOpen()) return null;

  return enqueue(async () => {
    if (isCircuitOpen()) return null;

    let lastError: unknown = null;
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        const content = await callLlm(text);
        const summary = extractSummary(content);
        if (!summary) throw new Error("未能从返回中解析出简介");
        summaryCache.set(text, { summary, expiry: Date.now() + CACHE_TTL_MS });
        scheduleSave();
        consecutiveFailures = 0;
        await sleep(REQUEST_GAP_MS);
        return summary;
      } catch (error) {
        lastError = error;
        console.warn(
          "[summarize] 失败（降级原文）：",
          error instanceof Error ? error.message : error,
        );
        if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
      }
    }
    recordFailure();
    return null;
  });
}
