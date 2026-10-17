/**
 * 文字心念起数法（本网站的自定义扩展玩法）
 *
 * ⚠️ 本取数法不是传统九宫小六壬古法，页面规则说明中已公开。
 * 规则（与需求文档 6.2 完全一致）：
 *   1. 对文本执行 Unicode NFC 规范化；
 *   2. 提取有效汉字序列，得到字符数 N；
 *   3. A = N；
 *   4. B = 所有有效汉字 Unicode 码点值之和；
 *   5. C = 所有有效汉字 Unicode 码点值平方之和；
 *   6. normalize(n) = ((n - 1) mod range) + 1，默认 range = 12；
 *   7. 最终起数为 normalize(A)、normalize(B)、normalize(C)。
 *
 * 本文件是纯函数模块，可在浏览器与 Node 中同样运行，且结果恒定可复现。
 */

import type { TextNumberingDetail } from '../divination/types';

/** 有效汉字推荐下限 / 推荐上限 / 硬性上限 */
export const TEXT_MIN_RECOMMENDED = 3;
export const TEXT_MAX_RECOMMENDED = 30;
export const TEXT_HARD_MAX = 200;

/** 取数范围配置：1 ~ 12（对齐十二时辰与十二月的量级） */
export const TEXT_NUMBER_RANGE = 12;

/**
 * 有效汉字判定。
 * 采用 Unicode Script=Han 语义（覆盖基本区、扩展 A/B/C/D/E/F/G、兼容区与〇）。
 * 说明：使用正则 Unicode Script 属性，引擎级实现，已覆盖代理对（如 𠮷 U+20BB7）。
 */
const HAN_SCRIPT_REGEX = /\p{Script=Han}/u;

/** 兜底范围判定（当运行环境不支持 Unicode Script 属性时使用） */
function isHanByRange(codePoint: number): boolean {
  return (
    (codePoint >= 0x3400 && codePoint <= 0x4dbf) || // 扩展 A
    (codePoint >= 0x4e00 && codePoint <= 0x9fff) || // 基本区
    (codePoint >= 0xf900 && codePoint <= 0xfaff) || // 兼容汉字
    (codePoint >= 0x20000 && codePoint <= 0x2ebef) || // 扩展 B~F
    (codePoint >= 0x2f800 && codePoint <= 0x2fa1f) || // 兼容补充
    codePoint === 0x3007 // 〇
  );
}

let hanRegexSupported: boolean | null = null;

function supportsHanRegex(): boolean {
  if (hanRegexSupported === null) {
    try {
      hanRegexSupported = HAN_SCRIPT_REGEX.test('汉');
    } catch {
      hanRegexSupported = false;
    }
  }
  return hanRegexSupported;
}

/** 判断单个码点是否为有效汉字 */
export function isHanCodePoint(codePoint: number): boolean {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return false;
  }
  if (supportsHanRegex()) {
    return HAN_SCRIPT_REGEX.test(String.fromCodePoint(codePoint));
  }
  return isHanByRange(codePoint);
}

/** NFC 规范化（不做其他删改，原文仍完整保留用于展示） */
export function normalizeNFC(raw: string): string {
  return raw.normalize('NFC');
}

/**
 * 提取有效汉字序列。
 * 按 Unicode 码点遍历（Array.from / for...of），不会把代理对错误拆分。
 * 空格、换行、标点、数字、字母、表情符号均不计入。
 */
export function extractHanCharacters(raw: string): string[] {
  const text = normalizeNFC(raw);
  const result: string[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0);
    if (cp !== undefined && isHanCodePoint(cp)) {
      result.push(char);
    }
  }
  return result;
}

/** B：码点值之和 */
export function sumCodePoints(chars: readonly string[]): number {
  return chars.reduce((acc, char) => acc + (char.codePointAt(0) ?? 0), 0);
}

/** C：码点值平方之和 */
export function sumSquaredCodePoints(chars: readonly string[]): number {
  return chars.reduce((acc, char) => {
    const cp = char.codePointAt(0) ?? 0;
    return acc + cp * cp;
  }, 0);
}

/** 归一化到 1..range */
export function normalizeToRange(n: number, range: number = TEXT_NUMBER_RANGE): number {
  if (!Number.isInteger(n) || n < 0) {
    throw new Error(`待归一化的数值必须为非负整数，收到：${String(n)}`);
  }
  if (!Number.isInteger(range) || range < 1) {
    throw new Error(`取数范围必须为大于等于 1 的整数，收到：${String(range)}`);
  }
  return ((n - 1) % range) + 1;
}

/** 有效汉字数量（有效字数统计，用于输入框实时提示） */
export function countHanCharacters(raw: string): number {
  return extractHanCharacters(raw).length;
}

/** 文字取数完整明细 */
export function textToNumbers(
  raw: string,
  range: number = TEXT_NUMBER_RANGE,
): TextNumberingDetail {
  const normalizedText = normalizeNFC(raw);
  const hanCharacters = extractHanCharacters(normalizedText);
  const count = hanCharacters.length;
  const codePointSum = sumCodePoints(hanCharacters);
  const codePointSquareSum = sumSquaredCodePoints(hanCharacters);
  const numbers: [number, number, number] = [
    normalizeToRange(count, range),
    normalizeToRange(codePointSum, range),
    normalizeToRange(codePointSquareSum, range),
  ];
  return {
    normalizedText,
    hanCharacters,
    count,
    codePointSum,
    codePointSquareSum,
    range,
    numbers,
  };
}

export type TextValidationLevel = 'ok' | 'warn' | 'error';

export interface TextValidation {
  level: TextValidationLevel;
  /** 是否可提交（error 不可提交） */
  canSubmit: boolean;
  message: string;
  count: number;
}

/** 文字输入校验：空白不可提交；不足 3 字仅提示；超过 30 字提示精简；超 200 字拒绝 */
export function validateTextInput(raw: string): TextValidation {
  const count = countHanCharacters(raw);
  if (raw.trim() === '') {
    return { level: 'error', canSubmit: false, message: '请先写下你此刻最想知道的事。', count };
  }
  if (count === 0) {
    return {
      level: 'error',
      canSubmit: false,
      message: '未检测到有效汉字，请使用中文输入。',
      count,
    };
  }
  if (count > TEXT_HARD_MAX) {
    return {
      level: 'error',
      canSubmit: false,
      message: `有效汉字 ${count} 字，已超过上限 ${TEXT_HARD_MAX} 字，请精简后重试。`,
      count,
    };
  }
  if (count > TEXT_MAX_RECOMMENDED) {
    return {
      level: 'warn',
      canSubmit: true,
      message: `有效汉字 ${count} 字，建议精简至 ${TEXT_MAX_RECOMMENDED} 字以内。`,
      count,
    };
  }
  if (count < TEXT_MIN_RECOMMENDED) {
    return {
      level: 'warn',
      canSubmit: true,
      message: `有效汉字 ${count} 字，建议 3 至 30 字；按第一反应输入即可。`,
      count,
    };
  }
  return { level: 'ok', canSubmit: true, message: `有效汉字 ${count} 字。`, count };
}
