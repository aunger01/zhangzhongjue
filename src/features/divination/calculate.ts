/**
 * 九宫小六壬 · 连续起宫算法（核心）
 *
 * 规则（与需求文档 3. 正式计算规则 完全一致）：
 *   1. 输入三个数字，分别代表月、日、时。
 *   2. 月份从"大安"（索引 0）起数，起宫本身计作第 1 位。
 *   3. 月份的落宫成为日期步骤的起宫；日期的落宫成为时辰步骤的起宫。
 *   4. 每一步均从当前起宫计作 1，按九宫顺序循环指定次数。
 *   5. 数学公式：resultIndex = (startIndex + count - 1) mod 9
 *
 * 本文件是纯函数模块：不引用任何 DOM / 视图 / 动画代码，可独立测试。
 */

import {
  ALGORITHM_ID,
  ALGORITHM_VERSION,
  ORIGIN_INDEX,
  PALACES,
  PALACE_COUNT,
} from './palaceConstants';
import type {
  DivinationInput,
  DivinationMode,
  DivinationResult,
  PalaceStep,
  StepName,
} from './types';

/** 三步演算的固定步骤顺序 */
export const STEP_ORDER: readonly StepName[] = ['month', 'day', 'hour'] as const;

function assertPalaceIndex(startIndex: number): void {
  if (!Number.isInteger(startIndex) || startIndex < 0 || startIndex > PALACE_COUNT - 1) {
    throw new Error(
      `起宫索引必须为 0 至 ${PALACE_COUNT - 1} 的整数，收到：${String(startIndex)}`,
    );
  }
}

function assertCount(count: number): void {
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`计数必须为大于等于 1 的整数，收到：${String(count)}`);
  }
}

/**
 * 单步计算：以 startIndex 为起宫（计作第 1 位），循环计数 count 次后的落宫索引。
 */
export function calculatePalace(startIndex: number, count: number): number {
  assertPalaceIndex(startIndex);
  assertCount(count);
  return (startIndex + count - 1) % PALACE_COUNT;
}

/**
 * 生成单步的完整计数路径。
 * 路径长度 === count，首项 === startIndex，末项 === 落宫索引。
 */
export function buildPathIndices(startIndex: number, count: number): number[] {
  assertPalaceIndex(startIndex);
  assertCount(count);
  const path = new Array<number>(count);
  for (let i = 0; i < count; i += 1) {
    path[i] = (startIndex + i) % PALACE_COUNT;
  }
  return path;
}

/** 构造单步结果对象（含完整路径） */
export function buildStep(step: StepName, startIndex: number, inputNumber: number): PalaceStep {
  const pathIndices = buildPathIndices(startIndex, inputNumber);
  return {
    step,
    inputNumber,
    startIndex,
    pathIndices,
    resultIndex: pathIndices[pathIndices.length - 1],
  };
}

/** 三步演算的完整结果（不含输入元信息） */
export interface ThreeStepsResult {
  steps: PalaceStep[];
  finalIndex: number;
}

/**
 * 核心算法：三步连续起宫。
 *
 * @param month 农历月份数字（1-12）
 * @param day   农历日期数字（1-30）
 * @param hour  时辰数字（1-12）
 */
export function calculateThreeSteps(month: number, day: number, hour: number): ThreeStepsResult {
  assertCount(month);
  assertCount(day);
  assertCount(hour);
  if (month > 12) {
    throw new Error(`农历月份必须为 1 至 12 的整数，收到：${month}`);
  }
  if (day > 30) {
    throw new Error(`农历日期必须为 1 至 30 的整数，收到：${day}`);
  }
  if (hour > 12) {
    throw new Error(`时辰数字必须为 1 至 12 的整数，收到：${hour}`);
  }

  const monthStep = buildStep('month', ORIGIN_INDEX, month);
  const dayStep = buildStep('day', monthStep.resultIndex, day);
  const hourStep = buildStep('hour', dayStep.resultIndex, hour);

  return {
    steps: [monthStep, dayStep, hourStep],
    finalIndex: hourStep.resultIndex,
  };
}

/** 构造完整结果对象（固定算法 id 与版本，供结果页展示与历史记录使用） */
export function createDivinationResult(
  input: {
    mode: DivinationMode;
    month: number;
    day: number;
    hour: number;
  },
  createdAt: number = Date.now(),
): DivinationResult {
  const { steps, finalIndex } = calculateThreeSteps(input.month, input.day, input.hour);
  const fixedInput: DivinationInput = {
    mode: input.mode,
    month: input.month,
    day: input.day,
    hour: input.hour,
    algorithmId: ALGORITHM_ID,
    algorithmVersion: ALGORITHM_VERSION,
  };
  return {
    input: fixedInput,
    steps,
    finalIndex,
    createdAt,
  };
}

/** 三步结果总览文本，例如 "小吉、空亡、病符" */
export function summarizeSteps(result: ThreeStepsResult): string {
  return result.steps.map((s) => PALACES[s.resultIndex]).join('、');
}
