/**
 * 传统汉字起课 · 笔画取数测试
 *
 * 重点覆盖四件事：
 *   1. 四档取数（≥3 字 / 2 字 / 1 字 / 0 字）；
 *   2. 笔画归约不改变落宫（穷举）；
 *   3. 生僻字与部首必须显式失败，不得猜测；
 *   4. 相同输入必然得到相同输出。
 */

import { describe, expect, it } from 'vitest';
import {
  STROKE_CHAR_COUNT,
  analyzeText,
  currentShichenNumber,
  formatNumbers,
  normalizeStroke,
} from '../features/text/strokeNumbering';
import { getStroke, STROKE_TABLE_SIZE } from '../features/text/strokeTable';

/** 与引擎一致的落宫公式，用于验证归约等价 */
function palaceOf(startIndex: number, count: number): number {
  return (startIndex + count - 1) % 9;
}

describe('笔画表', () => {
  it('覆盖 GB2312 常用字，且能取到已知笔画', () => {
    expect(STROKE_TABLE_SIZE).toBeGreaterThan(6700);
    expect(getStroke('大')).toBe(3);
    expect(getStroke('安')).toBe(6);
    expect(getStroke('吉')).toBe(6);
    expect(getStroke('刘')).toBe(6);
    expect(getStroke('仁')).toBe(4);
    expect(getStroke('贵')).toBe(9);
  });

  it('未收录字返回 null，而不是 0', () => {
    expect(getStroke('丨')).toBeNull();
    expect(getStroke('氵')).toBeNull();
    expect(getStroke('')).toBeNull();
  });
});

describe('normalizeStroke 归约', () => {
  it('1~9 原样返回', () => {
    for (let n = 1; n <= 9; n += 1) {
      expect(normalizeStroke(n)).toBe(n);
    }
  });

  it('超过 9 画回卷', () => {
    expect(normalizeStroke(10)).toBe(1);
    expect(normalizeStroke(18)).toBe(9);
    expect(normalizeStroke(19)).toBe(1);
    expect(normalizeStroke(30)).toBe(3);
  });

  it('非正整数直接报错', () => {
    expect(() => normalizeStroke(0)).toThrow();
    expect(() => normalizeStroke(-3)).toThrow();
    expect(() => normalizeStroke(3.5)).toThrow();
  });

  it('归约不改变落宫（笔画 1~200 × 起宫 0~8 穷举）', () => {
    for (let stroke = 1; stroke <= 200; stroke += 1) {
      const reduced = normalizeStroke(stroke);
      for (let start = 0; start < 9; start += 1) {
        expect(palaceOf(start, reduced)).toBe(palaceOf(start, stroke));
      }
    }
  });
});

describe('analyzeText 四档取数', () => {
  it('三字：直接取三字笔画', () => {
    const result = analyzeText('刘仁贵');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detail.count).toBe(3);
    expect(result.detail.padded).toBe(false);
    expect(result.detail.chars.map((item) => item.stroke)).toEqual([6, 4, 9]);
    expect(result.detail.numbers).toEqual([6, 4, 9]);
    expect(result.detail.sources).toEqual(['first-char', 'second-char', 'third-char']);
  });

  it('超过三字明确拒绝，要求用户自行删减，不替其截取', () => {
    const result = analyzeText('刘仁贵今天出门');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('too-many');
    expect(result.count).toBe(7);
    expect(result.message).toContain('由您定');
  });

  it('四字即超出，三字恰好可用（边界）', () => {
    expect(analyzeText('此事可否').ok).toBe(false);
    expect(analyzeText('此事可').ok).toBe(true);
  });

  it('两字：从大安起日', () => {
    const result = analyzeText('大安');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detail.padded).toBe(true);
    expect(result.detail.numbers).toEqual([1, 3, 6]);
    expect(result.detail.sources).toEqual(['pad-origin', 'first-char', 'second-char']);
    expect(result.detail.hour).toBeNull();
  });

  it('单字：从大安起日、日上起时', () => {
    const result = analyzeText('大', { hour: 5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detail.numbers).toEqual([1, 3, 5]);
    expect(result.detail.hour).toBe(5);
    expect(result.detail.hourName).toBe('辰时');
    expect(result.detail.sources).toEqual(['pad-origin', 'first-char', 'hour']);
  });

  it('单字未给时辰时明确失败，不擅自补值', () => {
    const result = analyzeText('大');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('hour-required');
    expect(result.count).toBe(1);
  });

  it('标点、空格、数字、字母不计入有效汉字', () => {
    const result = analyzeText('刘，仁 贵！2026 abc');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detail.count).toBe(3);
    expect(result.detail.hanCharacters).toEqual(['刘', '仁', '贵']);
  });

  it('空文本返回 empty', () => {
    const result = analyzeText('   ，。！  ');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('empty');
  });

  it('超出上限返回 too-many', () => {
    const result = analyzeText('大'.repeat(5), { maxCount: 3 });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('too-many');
  });
});

describe('生僻字处理', () => {
  it('部首不在表内时明确失败，并指出是第几个字', () => {
    const result = analyzeText('大丨安');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unknown-stroke');
    expect(result.unknown).toEqual([{ char: '丨', index: 2 }]);
    expect(result.message).toContain('丨');
  });

  it('不做跳过：第一个字不可识别即失败，不改用后面的字', () => {
    const result = analyzeText('丨大安');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('unknown-stroke');
  });
});

describe('确定性与展示', () => {
  it('相同输入必得相同结果', () => {
    const a = analyzeText('刘仁贵');
    const b = analyzeText('刘仁贵');
    expect(a).toEqual(b);
  });

  it('三数始终落在 1~9，可安全传入引擎', () => {
    const samples = ['大', '安', '刘仁贵', '此事可', '爨', '一'];
    for (const sample of samples) {
      const result = analyzeText(sample, { hour: 1 });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      for (const number of result.detail.numbers) {
        expect(number).toBeGreaterThanOrEqual(1);
        expect(number).toBeLessThanOrEqual(9);
      }
    }
  });

  it('STROKE_CHAR_COUNT 为 3', () => {
    expect(STROKE_CHAR_COUNT).toBe(3);
  });

  it('formatNumbers 用顿号连接', () => {
    expect(formatNumbers([3, 4, 9])).toBe('3、4、9');
  });

  it('时辰预填覆盖 1~12 且与时段对应', () => {
    const at = (hour: number) => currentShichenNumber(new Date(2026, 9, 19, hour, 30));
    expect(at(23)).toBe(1);
    expect(at(0)).toBe(1);
    expect(at(1)).toBe(2);
    expect(at(3)).toBe(3);
    expect(at(5)).toBe(4);
    expect(at(12)).toBe(7);
    expect(at(22)).toBe(12);
  });
});
