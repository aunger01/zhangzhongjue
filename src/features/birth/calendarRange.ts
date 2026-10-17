/**
 * 历法范围与公历日期校验（纯日期运算，不依赖任何历法库）
 *
 * 与 lunarConverter 分开，目的是让首页、规则说明等页面无需加载历法库，
 * 从而把较大的历法依赖留给"生辰起卦"按需加载。
 */

/**
 * 可靠支持范围。
 * 农历数据表可靠覆盖 1900-01-31（农历庚子年正月初一）至 2100-12-31。
 * 超出该范围的日期一律明确报错，不返回猜测结果。
 */
export const SUPPORTED_SOLAR_MIN = { year: 1900, month: 1, day: 31 } as const;
export const SUPPORTED_SOLAR_MAX = { year: 2100, month: 12, day: 31 } as const;
export const SUPPORTED_LUNAR_YEAR_MIN = 1900;
export const SUPPORTED_LUNAR_YEAR_MAX = 2100;

/** 数字键，便于比较日期先后（YYYYMMDD） */
export function dateKey(year: number, month: number, day: number): number {
  return year * 10000 + month * 100 + day;
}

/** 公历某月天数；月份非法返回 null */
export function daysInSolarMonth(year: number, month: number): number | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2) {
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return isLeap ? 29 : 28;
  }
  return lengths[month - 1];
}

/** 是否为合法的公历日期（含 2 月 29 日闰年判断） */
export function isValidSolarDate(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1 || year > 9999) return false;
  const max = daysInSolarMonth(year, month);
  if (max === null) return false;
  return day >= 1 && day <= max;
}

/** 是否在可靠支持范围内 */
export function isWithinSupportedSolarRange(year: number, month: number, day: number): boolean {
  const key = dateKey(year, month, day);
  return (
    key >= dateKey(SUPPORTED_SOLAR_MIN.year, SUPPORTED_SOLAR_MIN.month, SUPPORTED_SOLAR_MIN.day) &&
    key <= dateKey(SUPPORTED_SOLAR_MAX.year, SUPPORTED_SOLAR_MAX.month, SUPPORTED_SOLAR_MAX.day)
  );
}

/** 公历年份可选项（降序），用于下拉与范围提示 */
export function solarYearOptions(): number[] {
  const years: number[] = [];
  for (let y = SUPPORTED_SOLAR_MAX.year; y >= SUPPORTED_SOLAR_MIN.year; y -= 1) {
    years.push(y);
  }
  return years;
}

/** 农历年份可选项（降序） */
export function lunarYearOptions(): number[] {
  const years: number[] = [];
  for (let y = SUPPORTED_LUNAR_YEAR_MAX; y >= SUPPORTED_LUNAR_YEAR_MIN; y -= 1) {
    years.push(y);
  }
  return years;
}
