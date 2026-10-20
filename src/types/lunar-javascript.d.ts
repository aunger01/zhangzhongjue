/**
 * lunar-javascript 的本地类型声明（该库 1.7.7 未自带 .d.ts）
 *
 * 只声明本项目实际使用的 API，避免用 any 蒙混。
 * 若升级依赖版本，请先用实际输出核对这里的签名。
 */

declare module 'lunar-javascript' {
  export interface SolarInstance {
    getYear(): number;
    getMonth(): number;
    getDay(): number;
    getLunar(): LunarInstance;
    toYmd(): string;
    toString(): string;
  }

  export interface LunarInstance {
    getYear(): number;
    /** 闰月返回负数 */
    getMonth(): number;
    getDay(): number;
    getMonthInChinese(): string;
    getDayInChinese(): string;
    getYearInGanZhi(): string;
    getYearInChinese(): string;
    getSolar(): SolarInstance;
    toString(): string;
  }

  export interface LunarYearInstance {
    getYear(): number;
    /** 0 表示该年无闰月 */
    getLeapMonth(): number;
  }

  export interface LunarMonthInstance {
    getYear(): number;
    getMonth(): number;
    getDayCount(): number;
  }

  export interface SolarStatic {
    fromYmd(year: number, month: number, day: number): SolarInstance;
    fromDate(date: Date): SolarInstance;
  }

  export interface LunarStatic {
    fromYmd(year: number, month: number, day: number): LunarInstance;
    fromDate(date: Date): LunarInstance;
  }

  export interface LunarYearStatic {
    fromYear(year: number): LunarYearInstance;
  }

  export interface LunarMonthStatic {
    fromYm(year: number, month: number): LunarMonthInstance;
  }

  export interface lunarJavascriptModule {
    Solar: SolarStatic;
    Lunar: LunarStatic;
    LunarYear: LunarYearStatic;
    LunarMonth: LunarMonthStatic;
    SolarUtil: { isLeapYear(year: number): boolean; getDaysOfMonth(year: number, month: number): number };
  }

  const lunar: lunarJavascriptModule;
  export default lunar;
  export const Solar: SolarStatic;
  export const Lunar: LunarStatic;
  export const LunarYear: LunarYearStatic;
  export const LunarMonth: LunarMonthStatic;
}
