/**
 * 动画路径与节奏计划（playback plan）
 *
 * ⚠️ 关键纪律：动画层不得自行推算宫位。
 * 本文件只做两件事：
 *   1. 把算法层产出的 pathIndices 摊平成可逐帧播放的序列；
 *   2. 依据计数总量给出"前段快速掐指 + 末段减速落宫"的时间节奏。
 * 时间节奏只影响观看速度，绝不改变落点与最终结果。
 */

import type { DivinationResult, PalaceStep } from './types';

/** 每一帧：指向某一步的路径中的第 cursor 位（0 起） */
export interface PlaybackFrame {
  /** 第几步（0=月，1=日，2=时） */
  stepIndex: number;
  /** 该步路径中的位置（0 起） */
  cursor: number;
  /** 该位置对应的宫位索引（直接取自算法路径） */
  palaceIndex: number;
  /** 该位置是否为该步的落宫 */
  isLanding: boolean;
  /** 该位置是否为该步起宫 */
  isStart: boolean;
}

export interface PacingOptions {
  /** 速度倍率：0.5 / 1 / 2，越大越快 */
  speed: number;
  /** 系统 prefers-reduced-motion 或用户手动减少动效 */
  reducedMotion: boolean;
}

/** 默认单次移动时长（需求：默认每次移动约 250~450 毫秒） */
export const BASE_MOVE_MS = 340;

/** 落宫停留时长（需求：步骤结束停留约 600~1000 毫秒） */
export const LANDING_DWELL_MS = 820;

/** 减少动效时的节奏 */
const REDUCED_MOVE_MS = 90;
const REDUCED_DWELL_MS = 320;

/** 末段减速的间隔系数（对应剩余的 1~6 步） */
const DECELERATION_FACTORS = [0.95, 1.1, 1.3, 1.55, 1.8, 2.1];
/** 末段减速的门槛：剩余步数少于该值时开始减速 */
const DECELERATION_THRESHOLD = DECELERATION_FACTORS.length;

/** 快速阶段的系数（计数很长时前段加速，视觉上"连续掐指"） */
const FAST_FACTOR = 0.42;

/**
 * 计算从当前位置移动到下一位置所需的间隔。
 * @param remainingMoves 仍需移动的次数（不含已落位的位置）
 */
export function moveIntervalMs(remainingMoves: number, options: PacingOptions): number {
  if (options.reducedMotion) {
    return REDUCED_MOVE_MS;
  }
  const speed = options.speed > 0 ? options.speed : 1;
  let factor = 1;
  if (remainingMoves > DECELERATION_THRESHOLD) {
    factor = FAST_FACTOR;
  } else if (remainingMoves >= 1) {
    factor = DECELERATION_FACTORS[remainingMoves - 1];
  }
  return Math.max(40, Math.round((BASE_MOVE_MS * factor) / speed));
}

/** 落宫停留时长 */
export function landingDwellMs(options: PacingOptions): number {
  if (options.reducedMotion) {
    return REDUCED_DWELL_MS;
  }
  const speed = options.speed > 0 ? options.speed : 1;
  return Math.max(160, Math.round(LANDING_DWELL_MS / speed));
}

/**
 * 生成单步内每一次移动的间隔序列。
 * 返回数组长度 === count - 1（第 1 位是起宫，无需移动）。
 */
export function stepIntervalsMs(count: number, options: PacingOptions): number[] {
  const intervals: number[] = [];
  for (let cursor = 0; cursor < count - 1; cursor += 1) {
    const remainingMoves = count - 1 - cursor;
    intervals.push(moveIntervalMs(remainingMoves, options));
  }
  return intervals;
}

/** 覆盖全部三步的展示节奏（用于"跳过动画"后的进度与总时长预估） */
export function playbackPlan(result: DivinationResult, options: PacingOptions) {
  const perStep = result.steps.map((step) => {
    const intervals = stepIntervalsMs(step.inputNumber, options);
    const dwell = landingDwellMs(options);
    return { step: step.step, intervals, dwell, total: intervals.reduce((a, b) => a + b, 0) + dwell };
  });
  return {
    perStep,
    totalMs: perStep.reduce((a, b) => a + b.total, 0),
  };
}

/** 把每一步的路径摊平成连续帧序列（不含步骤间的停留） */
export function flattenFrames(steps: readonly PalaceStep[]): PlaybackFrame[] {
  const frames: PlaybackFrame[] = [];
  steps.forEach((step, stepIndex) => {
    step.pathIndices.forEach((palaceIndex, cursor) => {
      frames.push({
        stepIndex,
        cursor,
        palaceIndex,
        isLanding: cursor === step.pathIndices.length - 1,
        isStart: cursor === 0,
      });
    });
  });
  return frames;
}
