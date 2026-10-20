/**
 * 九宫小六壬 · 核心类型定义
 *
 * 本文件的类型是"算法契约"：算法层（calculate / buildPath）只依赖这些类型，
 * 动画层与视图层只能消费算法层产出的数据，不得自行推算宫位。
 */

/** 三步演算的步骤标识 */
export type StepName = 'month' | 'day' | 'hour';

/** 步骤的中文标签（用于界面展示） */
export const STEP_LABELS: Record<StepName, string> = {
  month: '月',
  day: '日',
  hour: '时',
};

/** 步骤的完整中文标题 */
export const STEP_TITLES: Record<StepName, string> = {
  month: '第一步：月',
  day: '第二步：日',
  hour: '第三步：时',
};

/** 起卦模式 */
export type DivinationMode = 'birth' | 'text';

/**
 * 单步演算的完整结果。
 * `pathIndices` 的长度严格等于 `inputNumber`：
 * 第 1 项是起宫，最后一项必然等于 `resultIndex`。
 */
export interface PalaceStep {
  step: StepName;
  /** 该步输入的数字（农历月 / 农历日 / 时辰数字） */
  inputNumber: number;
  /** 该步的起宫索引（0 起）：月份固定为 0（大安），其余为上一步的落宫 */
  startIndex: number;
  /** 完整计数路径，长度为 inputNumber */
  pathIndices: number[];
  /** 落宫索引（0 起） */
  resultIndex: number;
}

/** 演算输入（演算开始后应固定不变） */
export interface DivinationInput {
  mode: DivinationMode;
  /** 农历月份数字（1-12） */
  month: number;
  /** 农历日期数字（1-30） */
  day: number;
  /** 时辰数字（1-12） */
  hour: number;
  algorithmId: string;
  algorithmVersion: string;
}

/** 演算结果对象 */
export interface DivinationResult {
  input: DivinationInput;
  steps: PalaceStep[];
  finalIndex: number;
  createdAt: number;
}

/** 文字取数的明细，仅存在于当前会话内存中，默认不持久化 */
export interface TextNumberingDetail {
  /** 标准化（NFC）后的完整原文 */
  normalizedText: string;
  /** 提取出的有效汉字序列 */
  hanCharacters: string[];
  /** 有效汉字数量 A */
  count: number;
  /** Unicode 码点值之和 B */
  codePointSum: number;
  /** Unicode 码点值平方之和 C */
  codePointSquareSum: number;
  /** 取数范围上限（默认 12） */
  range: number;
  /** 归一化后的三个数字 */
  numbers: [number, number, number];
}

/** 生辰模式下的历法信息 */
export interface CalendarInfo {
  /** 'solar' 公历 | 'lunar' 农历 */
  inputType: 'solar' | 'lunar';
  solar: { year: number; month: number; day: number };
  lunar: {
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
    monthInChinese: string;
    dayInChinese: string;
    yearInGanZhi: string;
  };
  /** 展示用文本，例如"农历五月二十日，丑时" */
  displayText: string;
}
