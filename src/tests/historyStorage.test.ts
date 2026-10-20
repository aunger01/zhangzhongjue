import { beforeEach, describe, expect, it } from 'vitest';
import {
  HISTORY_KEY,
  HISTORY_LIMIT,
  appendHistory,
  clearHistory,
  createHistoryId,
  formatHistoryTime,
  isStorageAvailable,
  loadHistory,
  removeHistory,
  type HistoryEntry,
} from '../features/history/historyStorage';

function makeEntry(index: number): HistoryEntry {
  return {
    id: `h_${index}`,
    createdAt: 1_700_000_000_000 + index,
    mode: index % 2 === 0 ? 'birth' : 'text',
    inputSummary: index % 2 === 0 ? '农历五月二十日，丑时' : '心念文字（有效汉字 12 字）',
    numbersText: '5、20、2',
    palaces: ['小吉', '空亡', '病符'],
    algorithmId: 'jiugong-xiaoliuren',
    // 故意写旧版号：历史记录不按版本号过滤，旧条目须照常读回（勿随手改成当前版本）
    algorithmVersion: '1.0.0',
  };
}

describe('本地历史记录', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('jsdom 环境下存储可用', () => {
    expect(isStorageAvailable()).toBe(true);
  });

  it('空存储返回空数组', () => {
    expect(loadHistory()).toEqual([]);
  });

  it('新增后按时间倒序读取', () => {
    appendHistory(makeEntry(1));
    appendHistory(makeEntry(2));
    const list = loadHistory();
    expect(list.map((e) => e.id)).toEqual(['h_2', 'h_1']);
  });

  it('单条删除与一键清空', () => {
    appendHistory(makeEntry(1));
    appendHistory(makeEntry(2));
    expect(removeHistory('h_1').map((e) => e.id)).toEqual(['h_2']);
    expect(clearHistory()).toEqual([]);
    expect(window.localStorage.getItem(HISTORY_KEY)).toBeNull();
  });

  it('最多保留上限条数', () => {
    for (let i = 0; i < HISTORY_LIMIT + 12; i += 1) {
      appendHistory(makeEntry(i));
    }
    const list = loadHistory();
    expect(list).toHaveLength(HISTORY_LIMIT);
    expect(list[0].id).toBe(`h_${HISTORY_LIMIT + 11}`);
  });

  it('损坏的 JSON 不抛错，返回空数组', () => {
    window.localStorage.setItem(HISTORY_KEY, '{ not json');
    expect(loadHistory()).toEqual([]);
  });

  it('过滤掉结构不合法的记录', () => {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify([makeEntry(1), { foo: 'bar' }, null, 42]),
    );
    expect(loadHistory()).toHaveLength(1);
  });

  it('文字模式记录不含原文（仅字数摘要）', () => {
    const entry = makeEntry(1);
    appendHistory(entry);
    const stored = window.localStorage.getItem(HISTORY_KEY) ?? '';
    expect(stored).not.toContain('求问');
    expect(loadHistory()[0].inputSummary).toBe('心念文字（有效汉字 12 字）');
  });

  it('id 生成不依赖外部服务且互不相同', () => {
    const a = createHistoryId(1_700_000_000_000);
    const b = createHistoryId(1_700_000_000_000);
    expect(a).not.toBe(b);
    expect(a.startsWith('h_')).toBe(true);
  });

  it('时间格式化稳定', () => {
    const text = formatHistoryTime(1_700_000_000_000);
    expect(text).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});
