/**
 * 公历 / 农历转换
 *
 * 使用经过验证的 lunar-javascript（MIT，无第三方依赖）完成真实历法换算。
 * 不使用任何硬编码偏移，也不猜测结果：
 *   - 不合法日期直接报错；
 *   - 超出库可靠支持范围的年份明确提示；
 *   - 转换结果只由用户输入的日期决定，绝不使用系统当前日期代替。
 */

import lunarLib from 'lunar-javascript';
import type { CalendarInfo } from '../divination/types';
import {
  SUPPORTED_LUNAR_YEAR_MAX,
  SUPPORTED_LUNAR_YEAR_MIN,
  SUPPORTED_SOLAR_MAX,
  SUPPORTED_SOLAR_MIN,
  daysInSolarMonth,
  isWithinSupportedSolarRange,
  isValidSolarDate,
  lunarYearOptions,
  solarYearOptions,
} from './calendarRange';

const { Solar, Lunar, LunarYear } = lunarLib;

// 公历日期校验与支持范围属于纯日期运算，单独放在 calendarRange 中；
// 这里重新导出，保持本模块对外 API 稳定。
export {
  SUPPORTED_LUNAR_YEAR_MAX,
  SUPPORTED_LUNAR_YEAR_MIN,
  SUPPORTED_SOLAR_MAX,
  SUPPORTED_SOLAR_MIN,
  daysInSolarMonth,
  isWithinSupportedSolarRange,
  isValidSolarDate,
  lunarYearOptions,
  solarYearOptions,
};

export type ConversionErrorCode =
  | 'OUT_OF_RANGE'
  | 'INVALID_SOLAR_DATE'
  | 'INVALID_LUNAR_DATE'
  | 'NO_SUCH_LEAP_MONTH'
  | 'LIBRARY_ERROR';

export class LunarConversionError extends Error {
  readonly code: ConversionErrorCode;

  constructor(code: ConversionErrorCode, message: string) {
    super(message);
    this.name = 'LunarConversionError';
    this.code = code;
  }
}

function assertSolarInRange(year: number, month: number, day: number): void {
  if (!isValidSolarDate(year, month, day)) {
    throw new LunarConversionError(
      'INVALID_SOLAR_DATE',
      `公历日期不合法：${year} 年 ${month} 月 ${day} 日。`,
    );
  }
  if (!isWithinSupportedSolarRange(year, month, day)) {
    throw new LunarConversionError(
      'OUT_OF_RANGE',
      `公历 ${year} 年 ${month} 月 ${day} 日超出农历换算的可靠支持范围（${SUPPORTED_SOLAR_MIN.year}-${SUPPORTED_SOLAR_MIN.month}-${SUPPORTED_SOLAR_MIN.day} 至 ${SUPPORTED_SOLAR_MAX.year}-${SUPPORTED_SOLAR_MAX.month}-${SUPPORTED_SOLAR_MAX.day}）。`,
    );
  }
}

function assertLunarYearInRange(year: number): void {
  if (!Number.isInteger(year) || year < SUPPORTED_LUNAR_YEAR_MIN || year > SUPPORTED_LUNAR_YEAR_MAX) {
    throw new LunarConversionError(
      'OUT_OF_RANGE',
      `农历年份 ${year} 超出可靠支持范围（${SUPPORTED_LUNAR_YEAR_MIN}–${SUPPORTED_LUNAR_YEAR_MAX} 年）。`,
    );
  }
}

/** 某农历年的闰月月份（0 表示无闰月） */
export function getLeapMonth(year: number): number {
  assertLunarYearInRange(year);
  const leap = LunarYear.fromYear(year).getLeapMonth();
  return Number.isInteger(leap) ? leap : 0;
}

/** 某农历年是否存在指定闰月 */
export function hasLeapMonth(year: number, month: number): boolean {
  return getLeapMonth(year) === month;
}

/** 带符号的农历月（闰月为负），lunar-javascript 的规定 */
function signedLunarMonth(month: number, isLeap: boolean): number {
  return isLeap ? -month : month;
}

/**
 * 农历某月的实际天数（29 或 30）。
 * 以 lunar-javascript 自身的校验为准：先试第 30 日，失败即为 29 日。
 */
export function lunarMonthDayCount(year: number, month: number, isLeap: boolean): 29 | 30 {
  try {
    Lunar.fromYmd(year, signedLunarMonth(month, isLeap), 30);
    return 30;
  } catch {
    return 29;
  }
}

/** 农历日期是否合法（含闰月存在性、当月天数） */
export function isValidLunarDate(
  year: number,
  month: number,
  day: number,
  isLeap = false,
): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < SUPPORTED_LUNAR_YEAR_MIN || year > SUPPORTED_LUNAR_YEAR_MAX) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 30) return false;
  if (isLeap && !hasLeapMonth(year, month)) return false;
  return day <= lunarMonthDayCount(year, month, isLeap);
}

/** 农历月份用字（与 lunar-javascript 的用字一致，已由单元测试对照校验） */
const LUNAR_MONTH_CHARS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAY_UNITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/** 农历月中文名（含闰月前缀），例如 "五月" / "闰六月" / "正月" */
export function lunarMonthText(month: number, isLeap: boolean): string {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new LunarConversionError('INVALID_LUNAR_DATE', `农历月份必须为 1 至 12，收到：${month}`);
  }
  return `${isLeap ? '闰' : ''}${LUNAR_MONTH_CHARS[month - 1]}月`;
}

/** 农历日中文名，例如 "初一" / "二十" / "廿九" / "三十" */
export function lunarDayText(day: number): string {
  if (!Number.isInteger(day) || day < 1 || day > 30) {
    throw new LunarConversionError('INVALID_LUNAR_DATE', `农历日期必须为 1 至 30，收到：${day}`);
  }
  if (day <= 10) return `初${LUNAR_DAY_UNITS[day]}`;
  if (day < 20) return `十${LUNAR_DAY_UNITS[day - 10]}`;
  if (day === 20) return '二十';
  if (day < 30) return `廿${LUNAR_DAY_UNITS[day - 20]}`;
  return '三十';
}

/** 农历展示文本，例如 "农历五月二十日" */
function formatLunarDisplay(lunar: {
  month: number;
  day: number;
  isLeapMonth: boolean;
  monthInChinese: string;
  dayInChinese: string;
}): string {
  return `农历${lunar.monthInChinese}月${lunar.dayInChinese}日`;
}

/**
 * 内部：把 Lunar 实例读成我们自己的结构。
 * 中文用字由本地表格生成（已与库对照测试），保证显示文本完全可控。
 */
function readLunar(instance: {
  getYear(): number;
  getMonth(): number;
  getDay(): number;
  getYearInGanZhi(): string;
}) {
  const rawMonth = instance.getMonth();
  const isLeapMonth = rawMonth < 0;
  const month = Math.abs(rawMonth);
  const day = instance.getDay();
  return {
    year: instance.getYear(),
    month,
    day,
    isLeapMonth,
    monthInChinese: `${isLeapMonth ? '闰' : ''}${LUNAR_MONTH_CHARS[month - 1]}`,
    dayInChinese: lunarDayText(day),
    yearInGanZhi: instance.getYearInGanZhi(),
  };
}

/**
 * 公历 → 农历。
 * 转换结果完全由传入的日期决定。
 */
export function solarToLunar(year: number, month: number, day: number): CalendarInfo {
  assertSolarInRange(year, month, day);
  try {
    const solar = Solar.fromYmd(year, month, day);
    const lunar = readLunar(solar.getLunar());
    if (
      lunar.year < SUPPORTED_LUNAR_YEAR_MIN ||
      lunar.year > SUPPORTED_LUNAR_YEAR_MAX
    ) {
      throw new LunarConversionError('OUT_OF_RANGE', '换算得到的农历年份超出可靠支持范围。');
    }
    return {
      inputType: 'solar',
      solar: { year, month, day },
      lunar,
      displayText: formatLunarDisplay(lunar),
    };
  } catch (error) {
    if (error instanceof LunarConversionError) throw error;
    throw new LunarConversionError(
      'LIBRARY_ERROR',
      `公历 ${year}-${month}-${day} 换算农历失败：${(error as Error).message}`,
    );
  }
}

/** 农历 → 公历 */
export function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeap: boolean,
): CalendarInfo {
  assertLunarYearInRange(year);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new LunarConversionError('INVALID_LUNAR_DATE', `农历月份必须为 1 至 12，收到：${month}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 30) {
    throw new LunarConversionError('INVALID_LUNAR_DATE', `农历日期必须为 1 至 30，收到：${day}`);
  }
  if (isLeap && !hasLeapMonth(year, month)) {
    throw new LunarConversionError(
      'NO_SUCH_LEAP_MONTH',
      `${year} 年${month} 月没有闰月，请重新选择。`,
    );
  }
  const maxDay = lunarMonthDayCount(year, month, isLeap);
  if (day > maxDay) {
    throw new LunarConversionError(
      'INVALID_LUNAR_DATE',
      `农历${isLeap ? '闰' : ''}${month} 月只有 ${maxDay} 天，不存在第 ${day} 日。`,
    );
  }

  try {
    const lunarInstance = Lunar.fromYmd(year, signedLunarMonth(month, isLeap), day);
    const lunar = readLunar(lunarInstance);
    const solarInstance = lunarInstance.getSolar();
    const solar = {
      year: solarInstance.getYear(),
      month: solarInstance.getMonth(),
      day: solarInstance.getDay(),
    };
    if (!isWithinSupportedSolarRange(solar.year, solar.month, solar.day)) {
      throw new LunarConversionError(
        'OUT_OF_RANGE',
        `换算得到的公历 ${solar.year}-${solar.month}-${solar.day} 超出可靠支持范围。`,
      );
    }
    return {
      inputType: 'lunar',
      solar,
      lunar,
      displayText: formatLunarDisplay(lunar),
    };
  } catch (error) {
    if (error instanceof LunarConversionError) throw error;
    throw new LunarConversionError(
      'LIBRARY_ERROR',
      `农历 ${year} 年 ${isLeap ? '闰' : ''}${month} 月 ${day} 日换算公历失败：${(error as Error).message}`,
    );
  }
}

/** 默认年份：公历取 1990（避免默认值落在支持范围的边界） */
export const DEFAULT_SOLAR = { year: 1990, month: 1, day: 1 } as const;
