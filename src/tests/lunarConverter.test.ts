import { describe, expect, it } from 'vitest';
import lunarLib from 'lunar-javascript';
import {
  LunarConversionError,
  SUPPORTED_LUNAR_YEAR_MAX,
  SUPPORTED_LUNAR_YEAR_MIN,
  SUPPORTED_SOLAR_MAX,
  SUPPORTED_SOLAR_MIN,
  daysInSolarMonth,
  getLeapMonth,
  hasLeapMonth,
  isValidLunarDate,
  isValidSolarDate,
  isWithinSupportedSolarRange,
  lunarDayText,
  lunarMonthDayCount,
  lunarMonthText,
  lunarToSolar,
  solarToLunar,
} from '../features/birth/lunarConverter';

const { Lunar } = lunarLib;

describe('公历日期合法性', () => {
  it('月份天数含闰年 2 月', () => {
    expect(daysInSolarMonth(2024, 2)).toBe(29);
    expect(daysInSolarMonth(2023, 2)).toBe(28);
    expect(daysInSolarMonth(2000, 2)).toBe(29);
    expect(daysInSolarMonth(1900, 2)).toBe(28);
    expect(daysInSolarMonth(2026, 4)).toBe(30);
    expect(daysInSolarMonth(2026, 12)).toBe(31);
    expect(daysInSolarMonth(2026, 13)).toBeNull();
  });

  it('非法日期被拒绝（库本身不校验，必须自己拦）', () => {
    expect(isValidSolarDate(2025, 2, 30)).toBe(false);
    expect(isValidSolarDate(2025, 13, 1)).toBe(false);
    expect(isValidSolarDate(2023, 2, 29)).toBe(false);
    expect(isValidSolarDate(2024, 2, 29)).toBe(true);
    expect(isValidSolarDate(2026, 4, 31)).toBe(false);
    expect(isValidSolarDate(2026, 0, 10)).toBe(false);
  });

  it('支持范围边界', () => {
    expect(
      isWithinSupportedSolarRange(
        SUPPORTED_SOLAR_MIN.year,
        SUPPORTED_SOLAR_MIN.month,
        SUPPORTED_SOLAR_MIN.day,
      ),
    ).toBe(true);
    expect(
      isWithinSupportedSolarRange(
        SUPPORTED_SOLAR_MAX.year,
        SUPPORTED_SOLAR_MAX.month,
        SUPPORTED_SOLAR_MAX.day,
      ),
    ).toBe(true);
    expect(isWithinSupportedSolarRange(1900, 1, 30)).toBe(false);
    expect(isWithinSupportedSolarRange(2101, 1, 1)).toBe(false);
  });
});

describe('公历 → 农历', () => {
  it('公历 2026-07-04 为农历丙午年五月二十日', () => {
    const info = solarToLunar(2026, 7, 4);
    expect(info.lunar.year).toBe(2026);
    expect(info.lunar.month).toBe(5);
    expect(info.lunar.day).toBe(20);
    expect(info.lunar.isLeapMonth).toBe(false);
    expect(info.displayText).toBe('农历五月二十日');
    expect(info.inputType).toBe('solar');
  });

  it('跨年：公历 2026-02-17 为农历正月初一', () => {
    const info = solarToLunar(2026, 2, 17);
    expect(info.lunar.month).toBe(1);
    expect(info.lunar.day).toBe(1);
    expect(info.displayText).toBe('农历正月初一日');
  });

  it('公历年初属于上一农历年（不随公历年硬切）', () => {
    const info = solarToLunar(2026, 1, 1);
    expect(info.lunar.year).toBe(2025);
  });

  it('支持范围内大范围往返一致（抽样）', () => {
    for (let year = 1901; year <= 2099; year += 7) {
      for (const [m, d] of [
        [1, 15],
        [3, 1],
        [6, 20],
        [8, 31],
        [11, 30],
        [12, 31],
      ] as const) {
        const info = solarToLunar(year, m, d);
        const back = lunarToSolar(
          info.lunar.year,
          info.lunar.month,
          info.lunar.day,
          info.lunar.isLeapMonth,
        );
        expect(back.solar).toEqual({ year, month: m, day: d });
      }
    }
  });

  it('转换结果由输入决定，与系统当前日期无关', () => {
    const a = solarToLunar(2026, 7, 4);
    const b = solarToLunar(2026, 7, 4);
    expect(a.displayText).toBe(b.displayText);
    expect(a.lunar).toEqual(b.lunar);
    expect(solarToLunar(2026, 7, 5).lunar.day).toBe(21);
  });

  it('非法公历日期抛错（不静默返回结果）', () => {
    expect(() => solarToLunar(2025, 2, 30)).toThrow(LunarConversionError);
    expect(() => solarToLunar(2025, 2, 30)).toThrow(/不合法/);
  });

  it('超出可靠支持范围明确报错', () => {
    expect(() => solarToLunar(1899, 12, 31)).toThrow(/超出/);
    expect(() => solarToLunar(2101, 1, 1)).toThrow(/超出/);
    try {
      solarToLunar(1899, 12, 31);
    } catch (error) {
      expect((error as LunarConversionError).code).toBe('OUT_OF_RANGE');
    }
  });
});

describe('农历 → 公历', () => {
  it('农历二〇二六年五月二十日 = 公历 2026-07-04（验收案例）', () => {
    const info = lunarToSolar(2026, 5, 20, false);
    expect(info.solar).toEqual({ year: 2026, month: 7, day: 4 });
    expect(info.displayText).toBe('农历五月二十日');
    expect(info.inputType).toBe('lunar');
  });

  it('闰月：二〇二〇年闰四月十五 = 公历 2020-06-06', () => {
    const info = lunarToSolar(2020, 4, 15, true);
    expect(info.solar).toEqual({ year: 2020, month: 6, day: 6 });
    expect(info.lunar.isLeapMonth).toBe(true);
    expect(info.displayText).toBe('农历闰四月十五日');
  });

  it('闰月与同名平月是不同的日期', () => {
    const normal = lunarToSolar(2025, 6, 10, false);
    const leap = lunarToSolar(2025, 6, 10, true);
    expect(normal.solar).not.toEqual(leap.solar);
    expect(leap.lunar.isLeapMonth).toBe(true);
  });

  it('该年无闰月时选择闰月报错', () => {
    expect(hasLeapMonth(2026, 6)).toBe(false);
    expect(() => lunarToSolar(2026, 6, 1, true)).toThrow(/没有闰月/);
    try {
      lunarToSolar(2026, 6, 1, true);
    } catch (error) {
      expect((error as LunarConversionError).code).toBe('NO_SUCH_LEAP_MONTH');
    }
  });

  it('当月不存在的日期报错（大小月）', () => {
    expect(lunarMonthDayCount(2026, 5, false)).toBe(29);
    expect(lunarMonthDayCount(2025, 6, false)).toBe(30);
    expect(() => lunarToSolar(2026, 5, 30, false)).toThrow(/只有 29 天/);
    expect(lunarToSolar(2025, 6, 30, false).solar.day).toBeGreaterThan(0);
  });

  it('年份越界报错', () => {
    expect(() => lunarToSolar(SUPPORTED_LUNAR_YEAR_MIN - 1, 1, 1, false)).toThrow(/超出/);
    expect(() => lunarToSolar(SUPPORTED_LUNAR_YEAR_MAX + 1, 1, 1, false)).toThrow(/超出/);
  });

  it('农历日期合法性判断', () => {
    expect(isValidLunarDate(2026, 5, 20, false)).toBe(true);
    expect(isValidLunarDate(2026, 5, 30, false)).toBe(false);
    expect(isValidLunarDate(2025, 2, 30, false)).toBe(false);
    expect(isValidLunarDate(2025, 6, 1, true)).toBe(true);
    expect(isValidLunarDate(2026, 6, 1, true)).toBe(false);
    expect(isValidLunarDate(2026, 13, 1, false)).toBe(false);
    expect(isValidLunarDate(2026, 0, 1, false)).toBe(false);
  });
});

describe('闰月可用性', () => {
  it('已知闰月年份', () => {
    expect(getLeapMonth(2025)).toBe(6);
    expect(getLeapMonth(2023)).toBe(2);
    expect(getLeapMonth(2020)).toBe(4);
    expect(getLeapMonth(1900)).toBe(8);
    expect(getLeapMonth(2026)).toBe(0);
  });

  it('无闰月年份返回 0 且 hasLeapMonth 为 false', () => {
    expect(hasLeapMonth(2026, 6)).toBe(false);
    expect(hasLeapMonth(2026, 1)).toBe(false);
  });

  it('闰月年份对同一月份同时存在平月与闰月', () => {
    expect(hasLeapMonth(2025, 6)).toBe(true);
    expect(isValidLunarDate(2025, 6, 1, false)).toBe(true);
    expect(isValidLunarDate(2025, 6, 1, true)).toBe(true);
  });
});

describe('农历中文用字（与 lunar-javascript 对照）', () => {
  it('月份用字：正月 / 冬月 / 腊月 / 闰六月', () => {
    expect(lunarMonthText(1, false)).toBe('正月');
    expect(lunarMonthText(5, false)).toBe('五月');
    expect(lunarMonthText(11, false)).toBe('冬月');
    expect(lunarMonthText(12, false)).toBe('腊月');
    expect(lunarMonthText(6, true)).toBe('闰六月');
  });

  it('日期用字：初一 / 二十 / 廿九 / 三十', () => {
    expect(lunarDayText(1)).toBe('初一');
    expect(lunarDayText(10)).toBe('初十');
    expect(lunarDayText(11)).toBe('十一');
    expect(lunarDayText(19)).toBe('十九');
    expect(lunarDayText(20)).toBe('二十');
    expect(lunarDayText(21)).toBe('廿一');
    expect(lunarDayText(29)).toBe('廿九');
    expect(lunarDayText(30)).toBe('三十');
  });

  it('本地用字表与库输出逐项一致（防止用字漂移）', () => {
    for (let m = 1; m <= 12; m += 1) {
      const fromLib = Lunar.fromYmd(2024, m, 1).getMonthInChinese();
      expect(lunarMonthText(m, false)).toBe(`${fromLib}月`);
    }
    for (let d = 1; d <= 29; d += 1) {
      const fromLib = Lunar.fromYmd(2024, 1, d).getDayInChinese();
      expect(lunarDayText(d)).toBe(fromLib);
    }
  });

  it('越界用字报错', () => {
    expect(() => lunarMonthText(13, false)).toThrow();
    expect(() => lunarDayText(31)).toThrow();
  });
});
