/**
 * 六宫小六壬 · 连续起宫算法（核心）
 *
 * 规则（依《小六壬精华》传统六宫法，PDF 第 1、4、5 页）：
 *   1. 输入三个数字，分别代表月、日、时。
 *   2. **起宫由事由或占人决定**，不再固定为大安：
 *        通用问事 / 婚姻杂事 → 大安；求财经商 → 留连；疾厄病苦 → 速喜；
 *        官司诉讼 → 赤口；外出旅行 → 小吉；占人女 → 留连；占人男 → 小吉。
 *        空亡不起课（空则无物），只作落宫。
 *   3. 起宫本身计作第 1 位，按六宫顺序循环；月份的落宫成为日期的起宫，
 *      日期的落宫成为时辰的起宫。
 *   4. 数学公式：resultIndex = (startIndex + count - 1) mod 6
 *
 * 本文件是纯函数模块：不引用任何 DOM / 视图 / 动画代码，可独立测试。
 * 九宫引擎（divination/calculate.ts）不受影响，两套算法互不调用。
 */

import type { DivinationInput, DivinationResult, PalaceStep } from '../divination/types';
import {
  SIX_ALGORITHM_ID,
  SIX_ALGORITHM_NAME,
  SIX_ALGORITHM_VERSION,
  SIX_DEFAULT_ORIGIN_INDEX,
  SIX_PALACE_COUNT,
  SIX_PALACES,
  type SixPalaceName,
  type SixTopicId,
} from './sixConstants';

/** 三步演算的固定步骤顺序（与九宫一致：月 → 日 → 时） */
export const SIX_STEP_ORDER = ['month', 'day', 'hour'] as const;

/** 取数入口 */
export type SixNumbersSource = 'calendar' | 'report';

/** 六宫的演算输入（在九宫输入的基础上追加起宫与取数说明） */
export interface SixDivinationInput extends DivinationInput {
  /** 固定为 'six'，供历史记录与结果页区分宫制 */
  mode: 'six';
  /** 起宫索引（0 起） */
  originIndex: number;
  /** 起宫宫名 */
  originName: SixPalaceName;
  /** 起宫依据的完整说明，例如「婚姻杂事（官喜宫·大安）」 */
  originLabel: string;
  /** 取数说明，例如「农历三月初三 · 卯时」 */
  numbersNote: string;
  /** 取数入口：农历月日时 / 自报三数 */
  numbersSource: SixNumbersSource;
  /** 起宫依据的事由 id（通用 / 占人为 null），用于取用神与断课歌诀 */
  topicId: SixTopicId | null;
}

/** 六宫演算结果（结构上兼容九宫 DivinationResult，可直接交给同一套状态机播放） */
export interface SixResult extends Omit<DivinationResult, 'input'> {
  input: SixDivinationInput;
}

function assertOriginIndex(index: number): void {
  if (!Number.isInteger(index) || index < 0 || index > SIX_PALACE_COUNT - 1) {
    throw new Error(
      `六宫起宫索引必须为 0 至 ${SIX_PALACE_COUNT - 1} 的整数，收到：${String(index)}`,
    );
  }
}

function assertCount(count: number, label = '计数'): void {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`${label}必须为大于等于 1 的整数，收到：${String(count)}`);
  }
}

/**
 * 单步计算：以 startIndex 为起宫（计作第 1 位），循环计数 count 次后的落宫索引。
 */
export function sixCalculatePalace(startIndex: number, count: number): number {
  assertOriginIndex(startIndex);
  assertCount(count);
  return (startIndex + count - 1) % SIX_PALACE_COUNT;
}

/**
 * 生成单步的完整计数路径。
 * 路径长度 === count，首项 === startIndex，末项 === 落宫索引。
 */
export function sixBuildPathIndices(startIndex: number, count: number): number[] {
  assertOriginIndex(startIndex);
  assertCount(count);
  const path = new Array<number>(count);
  for (let i = 0; i < count; i += 1) {
    path[i] = (startIndex + i) % SIX_PALACE_COUNT;
  }
  return path;
}

/** 构造单步结果对象（含完整路径） */
export function sixBuildStep(
  step: PalaceStep['step'],
  startIndex: number,
  inputNumber: number,
): PalaceStep {
  const pathIndices = sixBuildPathIndices(startIndex, inputNumber);
  return {
    step,
    inputNumber,
    startIndex,
    pathIndices,
    resultIndex: pathIndices[pathIndices.length - 1],
  };
}

/** 三步演算的完整结果（不含输入元信息） */
export interface SixThreeStepsResult {
  steps: PalaceStep[];
  finalIndex: number;
}

/**
 * 核心算法：三步连续起宫（从指定起宫出发）。
 *
 * @param originIndex 起宫索引（0-5），由事由或占人决定
 * @param month 农历月份数字（1-12）
 * @param day   农历日期数字（1-30）
 * @param hour  时辰数字（1-12）
 */
export function sixCalculateThreeSteps(
  originIndex: number,
  month: number,
  day: number,
  hour: number,
): SixThreeStepsResult {
  assertOriginIndex(originIndex);
  assertCount(month, '农历月份');
  assertCount(day, '农历日期');
  assertCount(hour, '时辰数字');
  if (month > 12) throw new Error(`农历月份必须为 1 至 12 的整数，收到：${month}`);
  if (day > 30) throw new Error(`农历日期必须为 1 至 30 的整数，收到：${day}`);
  if (hour > 12) throw new Error(`时辰数字必须为 1 至 12 的整数，收到：${hour}`);

  const monthStep = sixBuildStep('month', originIndex, month);
  const dayStep = sixBuildStep('day', monthStep.resultIndex, day);
  const hourStep = sixBuildStep('hour', dayStep.resultIndex, hour);

  return { steps: [monthStep, dayStep, hourStep], finalIndex: hourStep.resultIndex };
}

/* ------------------------------------------------------------------ */
/* 变通取数：自报三数的归约                                              */
/* ------------------------------------------------------------------ */

/** 自报三数允许的范围 */
export const SIX_REPORT_MIN = 1;
export const SIX_REPORT_MAX = 99;

/**
 * 自报三数归约：任意大于 12 的数先归约到 1~12，再入数。
 *
 * 为什么归约不改变落宫：12 是 6 的倍数，
 *   ((n − 1) mod 12) + 1 − 1 ≡ n − 1 (mod 6)
 * 归约只压缩计数长度（让动画不至于数到 99 位），落宫与直接入数完全一致。
 */
export function sixReduceReportNumber(value: number): number {
  if (!Number.isInteger(value) || value < SIX_REPORT_MIN || value > SIX_REPORT_MAX) {
    throw new Error(`自报之数必须为 ${SIX_REPORT_MIN} 至 ${SIX_REPORT_MAX} 的整数，收到：${String(value)}`);
  }
  return ((value - 1) % 12) + 1;
}

/* ------------------------------------------------------------------ */
/* 结果对象构造                                                          */
/* ------------------------------------------------------------------ */

export interface CreateSixResultOptions {
  /** 起宫索引（0-5） */
  originIndex?: number;
  /** 起宫依据说明 */
  originLabel: string;
  /** 农历月份（1-12） */
  month: number;
  /** 农历日期（1-30） */
  day: number;
  /** 时辰（1-12） */
  hour: number;
  /** 取数说明 */
  numbersNote: string;
  /** 取数入口 */
  numbersSource?: SixNumbersSource;
  /** 起宫依据的事由 id（通用 / 占人为 null） */
  topicId?: SixTopicId | null;
  /** 固定创建时间（测试用） */
  createdAt?: number;
}

/** 构造完整结果对象（固定算法 id 与版本，供结果页展示与历史记录使用） */
export function createSixResult(options: CreateSixResultOptions): SixResult {
  const originIndex = options.originIndex ?? SIX_DEFAULT_ORIGIN_INDEX;
  const { steps, finalIndex } = sixCalculateThreeSteps(
    originIndex,
    options.month,
    options.day,
    options.hour,
  );
  const input: SixDivinationInput = {
    mode: 'six',
    month: options.month,
    day: options.day,
    hour: options.hour,
    originIndex,
    originName: SIX_PALACES[originIndex],
    originLabel: options.originLabel,
    numbersNote: options.numbersNote,
    numbersSource: options.numbersSource ?? 'calendar',
    topicId: options.topicId ?? null,
    algorithmId: SIX_ALGORITHM_ID,
    algorithmVersion: SIX_ALGORITHM_VERSION,
  };
  return {
    input,
    steps,
    finalIndex,
    createdAt: options.createdAt ?? Date.now(),
  };
}

/** 三步结果总览文本，例如 "大安、速喜、空亡" */
export function sixSummarizeSteps(result: SixThreeStepsResult): string {
  return result.steps.map((step) => SIX_PALACES[step.resultIndex]).join('、');
}

/** 算法名称（结果页徽章使用） */
export const SIX_ALGORITHM = {
  id: SIX_ALGORITHM_ID,
  version: SIX_ALGORITHM_VERSION,
  name: SIX_ALGORITHM_NAME,
} as const;
