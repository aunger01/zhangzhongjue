import { describe, expect, it } from 'vitest';
import {
  SHICHEN,
  describeShichen,
  shichenByNumber,
  shichenNumberFromDate,
  shichenNumberFromHour,
} from '../features/birth/timeMapping';

describe('十二时辰映射', () => {
  it('对照表与需求文档 5.2 完全一致', () => {
    expect(SHICHEN).toHaveLength(12);
    expect(SHICHEN.map((s) => s.name)).toEqual([
      '子时', '丑时', '寅时', '卯时', '辰时', '巳时',
      '午时', '未时', '申时', '酉时', '戌时', '亥时',
    ]);
    expect(SHICHEN.map((s) => s.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(SHICHEN.map((s) => s.range)).toEqual([
      '23:00–00:59', '01:00–02:59', '03:00–04:59', '05:00–06:59',
      '07:00–08:59', '09:00–10:59', '11:00–12:59', '13:00–14:59',
      '15:00–16:59', '17:00–18:59', '19:00–20:59', '21:00–22:59',
    ]);
  });

  it('丑时对应数字 2（验收案例）', () => {
    expect(shichenByNumber(2).name).toBe('丑时');
    expect(shichenByNumber(2).range).toBe('01:00–02:59');
  });

  it('每个 24 小时制小时映射到正确时辰', () => {
    const expected: Record<number, number> = {
      23: 1, 0: 1,
      1: 2, 2: 2,
      3: 3, 4: 3,
      5: 4, 6: 4,
      7: 5, 8: 5,
      9: 6, 10: 6,
      11: 7, 12: 7,
      13: 8, 14: 8,
      15: 9, 16: 9,
      17: 10, 18: 10,
      19: 11, 20: 11,
      21: 12, 22: 12,
    };
    for (let h = 0; h < 24; h += 1) {
      expect(shichenNumberFromHour(h), `${h} 时`).toBe(expected[h]);
    }
  });

  it('子时跨越午夜：23 时与 0 时同为子时', () => {
    expect(shichenNumberFromHour(23)).toBe(1);
    expect(shichenNumberFromHour(0)).toBe(1);
  });

  it('时辰数字越界报错', () => {
    expect(() => shichenByNumber(0)).toThrow();
    expect(() => shichenByNumber(13)).toThrow();
    expect(() => shichenByNumber(1.5)).toThrow();
    expect(() => shichenNumberFromHour(24)).toThrow();
    expect(() => shichenNumberFromHour(-1)).toThrow();
  });

  it('由 Date 判定时辰（本地时间）', () => {
    const at = new Date(2026, 6, 4, 1, 30, 0);
    expect(shichenNumberFromDate(at)).toBe(2);
    const at2 = new Date(2026, 6, 4, 23, 30, 0);
    expect(shichenNumberFromDate(at2)).toBe(1);
  });

  it('展示文案', () => {
    expect(describeShichen(2)).toBe('丑时（2）');
  });
});
