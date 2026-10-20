/**
 * 十二时辰映射
 *
 * 时辰由用户直接选择，不要求用户自己计算。
 * 若日后需要处理真太阳时、出生地时区、早晚子时等更复杂的出生时刻规则，
 * 应作为可选扩展；第一版不改变用户选择的时辰。
 */

export interface Shichen {
  /** 时辰数字（1-12），即该步的输入数字 */
  number: number;
  /** 时辰名，例如 "丑时" */
  name: string;
  /** 地支单字，例如 "丑" */
  branch: string;
  /** 常用时间范围，例如 "01:00–02:59" */
  range: string;
}

/** 十二时辰对照表（与需求文档 5.2 一致） */
export const SHICHEN: readonly Shichen[] = [
  { number: 1, name: '子时', branch: '子', range: '23:00–00:59' },
  { number: 2, name: '丑时', branch: '丑', range: '01:00–02:59' },
  { number: 3, name: '寅时', branch: '寅', range: '03:00–04:59' },
  { number: 4, name: '卯时', branch: '卯', range: '05:00–06:59' },
  { number: 5, name: '辰时', branch: '辰', range: '07:00–08:59' },
  { number: 6, name: '巳时', branch: '巳', range: '09:00–10:59' },
  { number: 7, name: '午时', branch: '午', range: '11:00–12:59' },
  { number: 8, name: '未时', branch: '未', range: '13:00–14:59' },
  { number: 9, name: '申时', branch: '申', range: '15:00–16:59' },
  { number: 10, name: '酉时', branch: '酉', range: '17:00–18:59' },
  { number: 11, name: '戌时', branch: '戌', range: '19:00–20:59' },
  { number: 12, name: '亥时', branch: '亥', range: '21:00–22:59' },
];

/** 依时辰数字取时辰（1-12） */
export function shichenByNumber(number: number): Shichen {
  if (!Number.isInteger(number) || number < 1 || number > 12) {
    throw new Error(`时辰数字必须为 1 至 12 的整数，收到：${String(number)}`);
  }
  return SHICHEN[number - 1];
}

/**
 * 依据 24 小时制小时数（0-23）判定时辰数字。
 * 23:00–00:59 为子时，01:00–02:59 为丑时，依此两小时一辰。
 */
export function shichenNumberFromHour(hour: number): number {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new Error(`小时必须为 0 至 23 的整数，收到：${String(hour)}`);
  }
  return Math.floor(((hour + 1) % 24) / 2) + 1;
}

/** 依据 Date 判定时辰数字（用于"此刻起卦"） */
export function shichenNumberFromDate(date: Date): number {
  return shichenNumberFromHour(date.getHours());
}

/** 展示用：时辰数字 → "丑时（2）" */
export function describeShichen(number: number): string {
  const s = shichenByNumber(number);
  return `${s.name}（${s.number}）`;
}

/** 时辰下拉选项文案 */
export function shichenOptionLabel(s: Shichen): string {
  return `${s.name} · ${s.range}`;
}
