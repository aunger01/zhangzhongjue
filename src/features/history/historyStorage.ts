/**
 * 本地历史记录（可选模块）
 *
 * 明确告知：仅保存在当前浏览器的 localStorage 中，可随时删除。
 * 隐私纪律：不保存心念原文，文字模式只记录有效字数。
 */

export interface HistoryEntry {
  id: string;
  createdAt: number;
  mode: 'birth' | 'text';
  /** 输入摘要（生辰为农历描述；文字模式仅为字数，不含原文） */
  inputSummary: string;
  /** 起数文本，例如 "5、20、2" */
  numbersText: string;
  palaces: [string, string, string];
  algorithmId: string;
  algorithmVersion: string;
}

export const HISTORY_KEY = 'palm-oracle:history:v1';
export const HISTORY_LIMIT = 30;

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__palm_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 本地存储是否可用（隐私模式下可能被禁用） */
export function isStorageAvailable(): boolean {
  return safeStorage() !== null;
}

function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<HistoryEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.createdAt === 'number' &&
    (entry.mode === 'birth' || entry.mode === 'text') &&
    typeof entry.inputSummary === 'string' &&
    typeof entry.numbersText === 'string' &&
    Array.isArray(entry.palaces) &&
    entry.palaces.length === 3
  );
}

export function loadHistory(): HistoryEntry[] {
  const storage = safeStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

function persist(entries: HistoryEntry[]): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
  } catch {
    // 存储写入失败不影响主流程
  }
}

export function appendHistory(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory()].slice(0, HISTORY_LIMIT);
  persist(next);
  return next;
}

export function removeHistory(id: string): HistoryEntry[] {
  const next = loadHistory().filter((entry) => entry.id !== id);
  persist(next);
  return next;
}

export function clearHistory(): HistoryEntry[] {
  const storage = safeStorage();
  if (storage) {
    try {
      storage.removeItem(HISTORY_KEY);
    } catch {
      // 忽略
    }
  }
  return [];
}

/** 生成一个本地 id（不依赖任何外部服务） */
export function createHistoryId(createdAt: number): string {
  return `h_${createdAt}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 展示用时间文本 */
export function formatHistoryTime(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
