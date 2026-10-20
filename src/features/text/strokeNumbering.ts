/**
 * 传统汉字起课 · 笔画取数
 *
 * 取数规则（四档，全部公开在规则页）：
 *   1. 对文本执行 Unicode NFC 规范化，提取有效汉字序列；
 *   2. 有效汉字须为 1~3 个，各取笔画数（简体规范笔顺）；
 *   3. 三字：[画₁, 画₂, 画₃]
 *      两字：[1, 画₁, 画₂]           —— 从大安起日、日上起时
 *      单字：[1, 画, 时辰]           —— 同上，末位由用户选定时辰
 *
 * ⚠️ 取哪几个字由用户自己决定（取字即取象，合「第一念头」之义）。
 *    程序不替用户截取：超过三个字一律拒绝，请用户自行删减。
 *   4. 每个笔画数先归约为 1~9：n' = ((n − 1) mod 9) + 1
 *      归约不改变落宫： (start + n − 1) mod 9 ≡ (start + n' − 1) mod 9
 *
 * 本文件是纯函数模块：不读时钟、不取随机、不访问网络。
 * 时辰由调用方显式传入（单字时才参与计算），因此相同输入必然得到相同输出。
 */

import { extractHanCharacters } from './textNumbering';
import { getStroke } from './strokeTable';
import { shichenByNumber, type Shichen } from '../birth/timeMapping';

/** 起数时参与计算的汉字上限（用户须自行精简到此数以内） */
export const STROKE_CHAR_COUNT = 3;

/** 归一化到 1~9（九宫） */
export function normalizeStroke(stroke: number): number {
  if (!Number.isInteger(stroke) || stroke < 1) {
    throw new Error(`笔画数必须为正整数，收到：${String(stroke)}`);
  }
  return ((stroke - 1) % 9) + 1;
}

/** 参与起数的一个字 */
export interface StrokeCharDetail {
  char: string;
  /** 原始笔画数（1~30） */
  stroke: number;
  /** 归约后的数（1~9） */
  number: number;
}

/** 三个数的来源，用于过程展示 */
export type StrokeSource =
  | 'first-char'
  | 'second-char'
  | 'third-char'
  | 'pad-origin'
  | 'hour';

export const STROKE_SOURCE_LABELS: Record<StrokeSource, string> = {
  'first-char': '第 1 字笔画',
  'second-char': '第 2 字笔画',
  'third-char': '第 3 字笔画',
  'pad-origin': '从大安起日',
  hour: '时辰',
};

/** 文字笔画取数的完整明细，仅存在于当前会话内存中，默认不持久化 */
export interface StrokeNumberingDetail {
  /** 标准化（NFC）后的完整原文 */
  normalizedText: string;
  /** 提取出的全部有效汉字 */
  hanCharacters: string[];
  /** 有效汉字总数 */
  count: number;
  /** 实际参与起数的字（1~3 个） */
  chars: StrokeCharDetail[];
  /** 是否为少字补位（有效字数 < 3） */
  padded: boolean;
  /** 单字起卦时补入的时辰；未使用为 null */
  hour: number | null;
  /** 单字起卦时补入的时辰名，例如「丑时」；未使用为 null */
  hourName: string | null;
  /**
   * 最终三数。
   * 笔画位已归约为 1~9；单字档末位是时辰数字，按 1~12 原样入引擎
   * （公式自带 (start + count − 1) mod 9，12 与 3 落宫相同，无需再归约）。
   */
  numbers: [number, number, number];
  /** 三数各自来源 */
  sources: [StrokeSource, StrokeSource, StrokeSource];
}

/** 无法取数时的原因 */
export type StrokeFailureReason =
  | 'empty'
  | 'unknown-stroke'
  | 'hour-required'
  | 'too-many';

export interface StrokeAnalysisOk {
  ok: true;
  detail: StrokeNumberingDetail;
}

export interface StrokeAnalysisError {
  ok: false;
  reason: StrokeFailureReason;
  /** 已识别的有效汉字（便于界面回显） */
  hanCharacters: string[];
  count: number;
  /** 无法识别笔画的字及其在有效汉字序列中的位置（从 1 起） */
  unknown: { char: string; index: number }[];
  message: string;
}

export type StrokeAnalysis = StrokeAnalysisOk | StrokeAnalysisError;

export interface StrokeAnalysisOptions {
  /** 单字起卦时补入的时辰（1~12）；三字及以上可传 null */
  hour?: number | null;
  /** 有效汉字上限（与输入框 maxLength 对齐） */
  maxCount?: number;
}

const DEFAULT_MAX_COUNT = 200;

/** 取全部有效汉字的笔画（调用前已保证 1~3 个）；任一字不在表内即返回失败，不做跳过 */
function resolveChars(hanCharacters: string[]): {
  chars: StrokeCharDetail[];
  unknown: { char: string; index: number }[];
} {
  const chars: StrokeCharDetail[] = [];
  const unknown: { char: string; index: number }[] = [];
  hanCharacters.forEach((char, index) => {
    const stroke = getStroke(char);
    if (stroke === null) {
      unknown.push({ char, index: index + 1 });
      return;
    }
    chars.push({ char, stroke, number: normalizeStroke(stroke) });
  });
  return { chars, unknown };
}

function fail(
  reason: StrokeFailureReason,
  hanCharacters: string[],
  message: string,
  unknown: { char: string; index: number }[] = [],
): StrokeAnalysisError {
  return { ok: false, reason, hanCharacters, count: hanCharacters.length, unknown, message };
}

/**
 * 分析一段文字能否起数，并返回三数明细。
 *
 * 不抛异常：用户可纠正的失败（空文本、生僻字、缺时辰）都以 `ok: false` 返回，便于表单直接展示。
 * 唯一的 throw 是调用方传入了非法 hour（编程错误，非用户输入问题）。
 */
export function analyzeText(raw: string, options: StrokeAnalysisOptions = {}): StrokeAnalysis {
  const { hour = null, maxCount = DEFAULT_MAX_COUNT } = options;
  const hanCharacters = extractHanCharacters(raw);
  const count = hanCharacters.length;

  if (count === 0) {
    return fail('empty', hanCharacters, '未检测到有效汉字，请使用中文输入。');
  }
  if (count > maxCount) {
    return fail(
      'too-many',
      hanCharacters,
      `有效汉字 ${count} 字，已超过上限 ${maxCount} 字，请精简后重试。`,
    );
  }
  if (count > STROKE_CHAR_COUNT) {
    return fail(
      'too-many',
      hanCharacters,
      `已写 ${count} 个汉字，请自行删减到 ${STROKE_CHAR_COUNT} 个字以内。取哪几个字由您定，这一步就是取象。`,
    );
  }

  let needHour = false;
  if (count === 1) {
    if (hour === null || hour === undefined) {
      needHour = true;
    } else if (!Number.isInteger(hour) || hour < 1 || hour > 12) {
      throw new Error(`时辰数字必须为 1 至 12 的整数，收到：${String(hour)}`);
    }
  }

  const { chars, unknown } = resolveChars(hanCharacters);

  if (unknown.length > 0) {
    const list = unknown.map((item) => `「${item.char}」`).join('、');
    return fail(
      'unknown-stroke',
      hanCharacters,
      `${list}的笔画数无法识别，请换一个说法（生僻字与部首暂不支持）。`,
      unknown,
    );
  }
  if (needHour) {
    return fail('hour-required', hanCharacters, '单字起卦需补一个时辰，请在上方选择。');
  }

  let numbers: [number, number, number];
  let sources: [StrokeSource, StrokeSource, StrokeSource];
  let hourValue: number | null = null;
  let hourName: string | null = null;

  if (count === 3) {
    numbers = [chars[0].number, chars[1].number, chars[2].number];
    sources = ['first-char', 'second-char', 'third-char'];
  } else if (count === 2) {
    numbers = [1, chars[0].number, chars[1].number];
    sources = ['pad-origin', 'first-char', 'second-char'];
  } else {
    // count === 1，此时 hour 必为 1~12 的整数
    hourValue = hour as number;
    const shichen: Shichen = shichenByNumber(hourValue);
    hourName = shichen.name;
    numbers = [1, chars[0].number, hourValue];
    sources = ['pad-origin', 'first-char', 'hour'];
  }

  return {
    ok: true,
    detail: {
      normalizedText: raw.normalize('NFC'),
      hanCharacters,
      count,
      chars,
      padded: count < STROKE_CHAR_COUNT,
      hour: hourValue,
      hourName,
      numbers,
      sources,
    },
  };
}

/** 三数的展示文本，例如 "3、4、9" */
export function formatNumbers(numbers: readonly number[]): string {
  return numbers.join('、');
}

/**
 * 由当前时刻推定时辰数字（1~12）。
 *
 * ⚠️ 仅用于表单的**预填默认值**，不参与算法确定性：
 *    算法层接收的是用户可见、可修改、可记录的显式时辰。
 */
export function currentShichenNumber(now: Date = new Date()): number {
  const hour = now.getHours();
  // 子时 23:00–00:59 → 1；此后每两小时进一位
  return Math.floor(((hour + 1) % 24) / 2) + 1;
}
