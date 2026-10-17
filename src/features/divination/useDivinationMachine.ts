/**
 * 掐指演算状态机
 *
 * 流程（与需求文档 11.1 一致）：
 *   IDLE → PREVIEW → READY → ANIMATING ⇄ PAUSED
 *                                ↓
 *                          STEP_COMPLETE → FINAL_RESULT
 *
 * 🔴 铁律：
 *   1. 演算开始后本次结果对象被"冻结"，暂停 / 继续 / 上一步 / 下一步 / 跳过 / 改速度
 *      一律不得重新计算，也绝不可能改变落宫。
 *   2. 本状态机不产生任何宫位，只按算法层返回的 pathIndices 前进。
 */

import { useEffect, useMemo, useReducer } from 'react';
import type { DivinationResult, PalaceStep, StepName } from './types';
import { landingDwellMs, moveIntervalMs } from './buildPath';
import { STEP_ORDER } from './calculate';

export type MachinePhase =
  | 'IDLE'
  | 'PREVIEW'
  | 'READY'
  | 'ANIMATING'
  | 'PAUSED'
  | 'STEP_COMPLETE'
  | 'FINAL_RESULT';

export interface MachineState {
  phase: MachinePhase;
  result: DivinationResult | null;
  /** 当前步骤下标：0=月 1=日 2=时 */
  stepIndex: number;
  /** 当前步骤路径中的位置（0 起，0 即起宫，计作第 1 位） */
  cursor: number;
  /** 已到达过的最大步骤下标，用于限制"上一步/回看"范围 */
  maxStepIndex: number;
  /** 是否自动进入下一步 */
  autoContinue: boolean;
  /** 动画速度倍率 */
  speed: number;
  /** 落宫动画序号，每次落宫自增，用于触发一次性特效 */
  landingSeq: number;
}

type MachineAction =
  | { type: 'LOAD'; result: DivinationResult }
  | { type: 'BEGIN' }
  | { type: 'START' }
  | { type: 'TICK' }
  | { type: 'LAND' }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'REVIEW_STEP'; stepIndex: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SKIP_ALL' }
  | { type: 'RESTART' }
  | { type: 'FINISH' }
  | { type: 'SET_SPEED'; speed: number }
  | { type: 'SET_AUTO'; autoContinue: boolean }
  | { type: 'CLEAR' };

export const INITIAL_MACHINE_STATE: MachineState = {
  phase: 'IDLE',
  result: null,
  stepIndex: 0,
  cursor: 0,
  maxStepIndex: 0,
  /** 默认自动继续：一步落宫后稍作停留即进入下一步，用户可随时切换为「手动逐步」 */
  autoContinue: true,
  speed: 1,
  landingSeq: 0,
};

function lastCursorOf(step: PalaceStep): number {
  return step.pathIndices.length - 1;
}

export function machineReducer(state: MachineState, action: MachineAction): MachineState {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        phase: 'PREVIEW',
        result: action.result,
        stepIndex: 0,
        cursor: 0,
        maxStepIndex: 0,
        landingSeq: 0,
      };

    case 'BEGIN':
      if (!state.result) return state;
      return { ...state, phase: 'READY', stepIndex: 0, cursor: 0, maxStepIndex: 0 };

    case 'START':
      if (!state.result) return state;
      if (state.phase !== 'READY' && state.phase !== 'PAUSED') return state;
      return { ...state, phase: 'ANIMATING' };

    case 'TICK': {
      if (state.phase !== 'ANIMATING' || !state.result) return state;
      const step = state.result.steps[state.stepIndex];
      const last = lastCursorOf(step);
      if (state.cursor < last) {
        const nextCursor = state.cursor + 1;
        // 到达路径末位即为落宫：立即高亮、扩散光圈并记录落宫序号
        if (nextCursor >= last) {
          return { ...state, cursor: nextCursor, phase: 'STEP_COMPLETE', landingSeq: state.landingSeq + 1 };
        }
        return { ...state, cursor: nextCursor };
      }
      return { ...state, phase: 'STEP_COMPLETE', landingSeq: state.landingSeq + 1 };
    }

    case 'LAND': {
      if (!state.result) return state;
      const step = state.result.steps[state.stepIndex];
      return {
        ...state,
        phase: 'STEP_COMPLETE',
        cursor: lastCursorOf(step),
        landingSeq: state.landingSeq + 1,
      };
    }

    case 'NEXT_STEP': {
      if (!state.result) return state;
      if (state.stepIndex >= state.result.steps.length - 1) {
        return { ...state, phase: 'FINAL_RESULT' };
      }
      const next = state.stepIndex + 1;
      return {
        ...state,
        phase: 'ANIMATING',
        stepIndex: next,
        cursor: 0,
        maxStepIndex: Math.max(state.maxStepIndex, next),
      };
    }

    case 'PREV_STEP': {
      if (!state.result || state.stepIndex <= 0) return state;
      const prev = state.stepIndex - 1;
      return {
        ...state,
        phase: 'STEP_COMPLETE',
        stepIndex: prev,
        cursor: lastCursorOf(state.result.steps[prev]),
      };
    }

    case 'REVIEW_STEP': {
      if (!state.result) return state;
      const target = action.stepIndex;
      if (target < 0 || target > state.maxStepIndex || target >= state.result.steps.length) {
        return state;
      }
      return {
        ...state,
        phase: target === state.maxStepIndex && state.phase === 'FINAL_RESULT' ? 'FINAL_RESULT' : 'STEP_COMPLETE',
        stepIndex: target,
        cursor: lastCursorOf(state.result.steps[target]),
      };
    }

    case 'PAUSE':
      if (state.phase !== 'ANIMATING') return state;
      return { ...state, phase: 'PAUSED' };

    case 'RESUME':
      if (state.phase !== 'PAUSED') return state;
      return { ...state, phase: 'ANIMATING' };

    case 'SKIP_ALL': {
      if (!state.result) return state;
      const last = state.result.steps.length - 1;
      return {
        ...state,
        phase: 'FINAL_RESULT',
        stepIndex: last,
        cursor: lastCursorOf(state.result.steps[last]),
        maxStepIndex: last,
        landingSeq: state.landingSeq + 1,
      };
    }

    case 'RESTART': {
      if (!state.result) return state;
      // 重新演算：仍使用同一个已冻结的结果对象
      return {
        ...state,
        phase: 'READY',
        stepIndex: 0,
        cursor: 0,
        maxStepIndex: 0,
        landingSeq: state.landingSeq + 1,
      };
    }

    case 'FINISH':
      if (!state.result) return state;
      return { ...state, phase: 'FINAL_RESULT' };

    case 'SET_SPEED':
      return { ...state, speed: action.speed };

    case 'SET_AUTO':
      return { ...state, autoContinue: action.autoContinue };

    case 'CLEAR':
      return { ...INITIAL_MACHINE_STATE, autoContinue: state.autoContinue, speed: state.speed };

    default:
      return state;
  }
}

export interface UseDivinationMachineOptions {
  /** 系统 prefers-reduced-motion 或用户手动减少动效 */
  reducedMotion: boolean;
}

export interface UseDivinationMachineResult {
  state: MachineState;
  /** 当前步骤对象（来自冻结的结果） */
  currentStep: PalaceStep | null;
  /** 当前步骤名 */
  currentStepName: StepName | null;
  /** 当前指节对应的宫位索引（直接取自算法路径） */
  activePalaceIndex: number | null;
  /** 当前步骤的起宫索引 */
  stepStartIndex: number | null;
  /** 当前步骤的落宫索引（未落宫时为其预期值） */
  stepResultIndex: number | null;
  /** 当前计数序号（第几位，1 起） */
  currentOrdinal: number;
  /** 每一步的状态：pending / active / done */
  stepStatuses: Array<'pending' | 'active' | 'done'>;
  /** 整体进度 0..1 */
  progress: number;
  actions: {
    load: (result: DivinationResult) => void;
    begin: () => void;
    start: () => void;
    pause: () => void;
    resume: () => void;
    nextStep: () => void;
    prevStep: () => void;
    reviewStep: (stepIndex: number) => void;
    skipAll: () => void;
    restart: () => void;
    finish: () => void;
    setSpeed: (speed: number) => void;
    setAutoContinue: (auto: boolean) => void;
    clear: () => void;
  };
}

export function useDivinationMachine(
  options: UseDivinationMachineOptions,
): UseDivinationMachineResult {
  const [state, dispatch] = useReducer(machineReducer, INITIAL_MACHINE_STATE);
  const { reducedMotion } = options;

  const pacing = useMemo(
    () => ({ speed: state.speed, reducedMotion }),
    [state.speed, reducedMotion],
  );

  // READY：手掌就位后自动开始（不强制用户等待，但也不阻塞操作）
  useEffect(() => {
    if (state.phase !== 'READY') return undefined;
    const delay = reducedMotion ? 200 : 700;
    const timer = window.setTimeout(() => dispatch({ type: 'START' }), delay);
    return () => window.clearTimeout(timer);
  }, [state.phase, reducedMotion]);

  // ANIMATING：按算法路径逐位前进
  useEffect(() => {
    if (state.phase !== 'ANIMATING' || !state.result) return undefined;
    const step = state.result.steps[state.stepIndex];
    const remaining = lastCursorOf(step) - state.cursor;
    if (remaining <= 0) {
      dispatch({ type: 'LAND' });
      return undefined;
    }
    const delay = moveIntervalMs(remaining, pacing);
    const timer = window.setTimeout(() => dispatch({ type: 'TICK' }), delay);
    return () => window.clearTimeout(timer);
  }, [state.phase, state.cursor, state.stepIndex, state.result, pacing]);

  // STEP_COMPLETE：自动继续模式下停留片刻后进入下一步
  useEffect(() => {
    if (state.phase !== 'STEP_COMPLETE' || !state.autoContinue) return undefined;
    const result = state.result;
    if (!result) return undefined;
    const isLast = state.stepIndex >= result.steps.length - 1;
    const timer = window.setTimeout(() => {
      dispatch(isLast ? { type: 'FINISH' } : { type: 'NEXT_STEP' });
    }, landingDwellMs(pacing));
    return () => window.clearTimeout(timer);
  }, [state.phase, state.autoContinue, state.stepIndex, state.result, pacing]);

  const actions = useMemo(
    () => ({
      load: (result: DivinationResult) => dispatch({ type: 'LOAD', result }),
      begin: () => dispatch({ type: 'BEGIN' }),
      start: () => dispatch({ type: 'START' }),
      pause: () => dispatch({ type: 'PAUSE' }),
      resume: () => dispatch({ type: 'RESUME' }),
      nextStep: () => dispatch({ type: 'NEXT_STEP' }),
      prevStep: () => dispatch({ type: 'PREV_STEP' }),
      reviewStep: (stepIndex: number) => dispatch({ type: 'REVIEW_STEP', stepIndex }),
      skipAll: () => dispatch({ type: 'SKIP_ALL' }),
      restart: () => dispatch({ type: 'RESTART' }),
      finish: () => dispatch({ type: 'FINISH' }),
      setSpeed: (speed: number) => dispatch({ type: 'SET_SPEED', speed }),
      setAutoContinue: (autoContinue: boolean) => dispatch({ type: 'SET_AUTO', autoContinue }),
      clear: () => dispatch({ type: 'CLEAR' }),
    }),
    [],
  );

  const currentStep = state.result ? state.result.steps[state.stepIndex] : null;

  const activePalaceIndex = currentStep ? currentStep.pathIndices[state.cursor] : null;

  const stepStatuses = useMemo<Array<'pending' | 'active' | 'done'>>(() => {
    if (!state.result) return ['pending', 'pending', 'pending'];
    return STEP_ORDER.map((_, index) => {
      if (index < state.stepIndex) return 'done';
      if (index === state.stepIndex) {
        return state.phase === 'STEP_COMPLETE' || state.phase === 'FINAL_RESULT'
          ? 'done'
          : 'active';
      }
      return 'pending';
    });
  }, [state.result, state.stepIndex, state.phase]);

  const progress = useMemo(() => {
    if (!state.result) return 0;
    const total = state.result.steps.length;
    const step = state.result.steps[state.stepIndex];
    const withinStep = total > 0 ? (state.cursor + 1) / step.pathIndices.length : 0;
    if (state.phase === 'FINAL_RESULT') return 1;
    return Math.min(1, (state.stepIndex + withinStep) / total);
  }, [state.result, state.stepIndex, state.cursor, state.phase]);

  const currentOrdinal = state.cursor + 1;

  return {
    state,
    currentStep,
    currentStepName: currentStep ? currentStep.step : null,
    activePalaceIndex,
    stepStartIndex: currentStep ? currentStep.startIndex : null,
    stepResultIndex: currentStep ? currentStep.resultIndex : null,
    currentOrdinal,
    stepStatuses,
    progress,
    actions,
  };
}

/** 供测试与外部使用的纯函数导出 */
export { machineReducer as __machineReducer };
