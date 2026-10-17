import { describe, expect, it } from 'vitest';
import {
  INITIAL_MACHINE_STATE,
  machineReducer,
  type MachineState,
} from '../features/divination/useDivinationMachine';
import { createDivinationResult } from '../features/divination/calculate';
import { PALACES } from '../features/divination/palaceConstants';

const result = createDivinationResult({ mode: 'birth', month: 5, day: 20, hour: 2 }, 1_700_000_000_000);

function reduce(state: MachineState, ...actions: Parameters<typeof machineReducer>[1][]): MachineState {
  return actions.reduce((acc, action) => machineReducer(acc, action), state);
}

/** 从加载到"第一步落宫" */
function toFirstLanding(): MachineState {
  let state = reduce(INITIAL_MACHINE_STATE, { type: 'LOAD', result }, { type: 'BEGIN' }, { type: 'START' });
  // 月份 5 → 需要 4 次移动
  for (let i = 0; i < 4; i += 1) state = machineReducer(state, { type: 'TICK' });
  return state;
}

describe('状态机 · 基本流转', () => {
  it('初始为 IDLE', () => {
    expect(INITIAL_MACHINE_STATE.phase).toBe('IDLE');
    expect(INITIAL_MACHINE_STATE.result).toBeNull();
  });

  it('LOAD 后进入 PREVIEW 并冻结结果', () => {
    const state = machineReducer(INITIAL_MACHINE_STATE, { type: 'LOAD', result });
    expect(state.phase).toBe('PREVIEW');
    expect(state.result).toBe(result);
    expect(state.stepIndex).toBe(0);
    expect(state.cursor).toBe(0);
  });

  it('PREVIEW → READY → ANIMATING', () => {
    const state = reduce(
      INITIAL_MACHINE_STATE,
      { type: 'LOAD', result },
      { type: 'BEGIN' },
      { type: 'START' },
    );
    expect(state.phase).toBe('ANIMATING');
    expect(state.cursor).toBe(0);
  });

  it('非 READY / PAUSED 状态下 START 无效', () => {
    const idle = machineReducer(INITIAL_MACHINE_STATE, { type: 'START' });
    expect(idle.phase).toBe('IDLE');
    const preview = reduce(INITIAL_MACHINE_STATE, { type: 'LOAD', result }, { type: 'START' });
    expect(preview.phase).toBe('PREVIEW');
  });
});

describe('状态机 · 逐位推进与落宫', () => {
  it('TICK 逐位前进，末位转入 STEP_COMPLETE 并触发落宫序号', () => {
    let state = reduce(
      INITIAL_MACHINE_STATE,
      { type: 'LOAD', result },
      { type: 'BEGIN' },
      { type: 'START' },
    );
    expect(state.cursor).toBe(0);
    state = machineReducer(state, { type: 'TICK' });
    expect(state.cursor).toBe(1);
    expect(state.phase).toBe('ANIMATING');

    state = reduce(state, { type: 'TICK' }, { type: 'TICK' });
    expect(state.cursor).toBe(3);

    state = machineReducer(state, { type: 'TICK' });
    expect(state.cursor).toBe(4);
    expect(state.phase).toBe('STEP_COMPLETE');
    expect(state.landingSeq).toBe(1);

    // 已到末位，再 TICK 不应越界
    const extra = machineReducer(state, { type: 'TICK' });
    expect(extra.cursor).toBe(4);
  });

  it('落宫位置与算法路径末项一致（小吉）', () => {
    const state = toFirstLanding();
    const step = state.result!.steps[state.stepIndex];
    expect(PALACES[step.pathIndices[state.cursor]]).toBe('小吉');
    expect(state.cursor).toBe(step.pathIndices.length - 1);
  });

  it('NEXT_STEP 从当前落宫继续，且起宫等于上一步落宫', () => {
    let state = toFirstLanding();
    state = machineReducer(state, { type: 'NEXT_STEP' });
    expect(state.phase).toBe('ANIMATING');
    expect(state.stepIndex).toBe(1);
    expect(state.cursor).toBe(0);
    const monthStep = state.result!.steps[0];
    const dayStep = state.result!.steps[1];
    expect(dayStep.startIndex).toBe(monthStep.resultIndex);
  });

  it('最后一步 STEP_COMPLETE 后 NEXT_STEP 进入 FINAL_RESULT', () => {
    let state = reduce(
      INITIAL_MACHINE_STATE,
      { type: 'LOAD', result },
      { type: 'BEGIN' },
      { type: 'START' },
    );
    for (let step = 0; step < 3; step += 1) {
      const stepObj = state.result!.steps[state.stepIndex];
      while (state.phase === 'ANIMATING') state = machineReducer(state, { type: 'TICK' });
      expect(state.phase).toBe('STEP_COMPLETE');
      expect(state.cursor).toBe(stepObj.pathIndices.length - 1);
      state = machineReducer(state, { type: 'NEXT_STEP' });
    }
    expect(state.phase).toBe('FINAL_RESULT');
    expect(PALACES[state.result!.steps[state.stepIndex].resultIndex]).toBe('病符');
  });
});

describe('状态机 · 操作按钮', () => {
  it('暂停 / 继续 只在 ANIMATING 与 PAUSED 之间切换', () => {
    let state = reduce(
      INITIAL_MACHINE_STATE,
      { type: 'LOAD', result },
      { type: 'BEGIN' },
      { type: 'START' },
      { type: 'TICK' },
    );
    const cursorBefore = state.cursor;
    state = machineReducer(state, { type: 'PAUSE' });
    expect(state.phase).toBe('PAUSED');
    expect(state.cursor).toBe(cursorBefore);
    // 暂停期间 TICK 不生效
    const stuck = machineReducer(state, { type: 'TICK' });
    expect(stuck.cursor).toBe(cursorBefore);
    expect(stuck.phase).toBe('PAUSED');

    state = machineReducer(state, { type: 'RESUME' });
    expect(state.phase).toBe('ANIMATING');
  });

  it('READY 状态下 PAUSE 无效', () => {
    const ready = reduce(INITIAL_MACHINE_STATE, { type: 'LOAD', result }, { type: 'BEGIN' });
    expect(machineReducer(ready, { type: 'PAUSE' }).phase).toBe('READY');
  });

  it('上一步：回到前一步的落宫状态，不改变结果', () => {
    let state = toFirstLanding();
    state = machineReducer(state, { type: 'NEXT_STEP' });
    while (state.phase === 'ANIMATING') state = machineReducer(state, { type: 'TICK' });
    expect(state.stepIndex).toBe(1);
    expect(PALACES[state.result!.steps[1].resultIndex]).toBe('空亡');

    state = machineReducer(state, { type: 'PREV_STEP' });
    expect(state.stepIndex).toBe(0);
    expect(state.cursor).toBe(state.result!.steps[0].pathIndices.length - 1);
    expect(state.phase).toBe('STEP_COMPLETE');
    expect(PALACES[state.result!.steps[0].resultIndex]).toBe('小吉');

    // 第一步再点"上一步"无效
    const first = machineReducer(state, { type: 'PREV_STEP' });
    expect(first.stepIndex).toBe(0);
  });

  it('跳过动画：直接到最终结果，路径数据仍完整', () => {
    const state = reduce(
      INITIAL_MACHINE_STATE,
      { type: 'LOAD', result },
      { type: 'BEGIN' },
      { type: 'START' },
      { type: 'SKIP_ALL' },
    );
    expect(state.phase).toBe('FINAL_RESULT');
    expect(state.stepIndex).toBe(2);
    expect(state.maxStepIndex).toBe(2);
    expect(state.cursor).toBe(state.result!.steps[2].pathIndices.length - 1);
    expect(state.result!.steps[0].pathIndices).toHaveLength(5);
    expect(state.result!.steps[1].pathIndices).toHaveLength(20);
    expect(PALACES[state.result!.steps[2].resultIndex]).toBe('病符');
  });

  it('重新演算：结果对象保持同一引用，仅重置播放位置', () => {
    const skipped = reduce(
      INITIAL_MACHINE_STATE,
      { type: 'LOAD', result },
      { type: 'BEGIN' },
      { type: 'START' },
      { type: 'SKIP_ALL' },
      { type: 'RESTART' },
    );
    expect(skipped.phase).toBe('READY');
    expect(skipped.stepIndex).toBe(0);
    expect(skipped.cursor).toBe(0);
    expect(skipped.result).toBe(result);
    expect(skipped.landingSeq).toBe(2);
  });

  it('回看：受 maxStepIndex 限制，不能跳到未推演的步骤', () => {
    let state = reduce(
      INITIAL_MACHINE_STATE,
      { type: 'LOAD', result },
      { type: 'BEGIN' },
      { type: 'START' },
      { type: 'SKIP_ALL' },
    );
    state = machineReducer(state, { type: 'REVIEW_STEP', stepIndex: 0 });
    expect(state.stepIndex).toBe(0);
    expect(state.cursor).toBe(4);
    const invalid = machineReducer(state, { type: 'REVIEW_STEP', stepIndex: 5 });
    expect(invalid.stepIndex).toBe(0);
    const negative = machineReducer(state, { type: 'REVIEW_STEP', stepIndex: -1 });
    expect(negative.stepIndex).toBe(0);
  });

  it('速度与自动继续是纯设置项', () => {
    let state = machineReducer(INITIAL_MACHINE_STATE, { type: 'SET_SPEED', speed: 2 });
    state = machineReducer(state, { type: 'SET_AUTO', autoContinue: true });
    expect(state.speed).toBe(2);
    expect(state.autoContinue).toBe(true);
    expect(state.result).toBeNull();
  });

  it('CLEAR 重置状态但保留用户设置', () => {
    const state = reduce(
      INITIAL_MACHINE_STATE,
      { type: 'SET_SPEED', speed: 0.5 },
      { type: 'SET_AUTO', autoContinue: true },
      { type: 'LOAD', result },
      { type: 'BEGIN' },
      { type: 'CLEAR' },
    );
    expect(state.phase).toBe('IDLE');
    expect(state.result).toBeNull();
    expect(state.speed).toBe(0.5);
    expect(state.autoContinue).toBe(true);
  });
});

describe('状态机 · 结果冻结与确定性', () => {
  it('任何操作序列都不会替换结果对象', () => {
    let state = machineReducer(INITIAL_MACHINE_STATE, { type: 'LOAD', result });
    const actions: Parameters<typeof machineReducer>[1][] = [
      { type: 'BEGIN' },
      { type: 'START' },
      { type: 'TICK' },
      { type: 'PAUSE' },
      { type: 'RESUME' },
      { type: 'TICK' },
      { type: 'SET_SPEED', speed: 0.5 },
      { type: 'SET_AUTO', autoContinue: true },
      { type: 'NEXT_STEP' },
      { type: 'PREV_STEP' },
      { type: 'SKIP_ALL' },
      { type: 'RESTART' },
      { type: 'FINISH' },
    ];
    actions.forEach((action) => {
      state = machineReducer(state, action);
      expect(state.result).toBe(result);
    });
  });

  it('相同操作序列产生相同状态轨迹', () => {
    const run = () => {
      let state = reduce(
        INITIAL_MACHINE_STATE,
        { type: 'LOAD', result },
        { type: 'BEGIN' },
        { type: 'START' },
      );
      const trail: Array<[number, number, string]> = [];
      for (let i = 0; i < 30; i += 1) {
        state = machineReducer(state, { type: 'TICK' });
        trail.push([state.stepIndex, state.cursor, state.phase]);
        if (state.phase === 'STEP_COMPLETE') state = machineReducer(state, { type: 'NEXT_STEP' });
      }
      return trail;
    };
    expect(run()).toEqual(run());
  });

  it('动画推进过程中经过的宫位与算法路径逐项一致', () => {
    let state = reduce(
      INITIAL_MACHINE_STATE,
      { type: 'LOAD', result },
      { type: 'BEGIN' },
      { type: 'START' },
    );
    const visited: number[] = [];
    for (let guard = 0; guard < 200; guard += 1) {
      if (state.phase === 'FINAL_RESULT') break;
      const step = state.result!.steps[state.stepIndex];
      visited.push(step.pathIndices[state.cursor]);
      if (state.phase === 'STEP_COMPLETE') {
        state = machineReducer(state, { type: 'NEXT_STEP' });
        continue;
      }
      state = machineReducer(state, { type: 'TICK' });
    }
    const expected = [
      ...result.steps[0].pathIndices,
      ...result.steps[1].pathIndices,
      ...result.steps[2].pathIndices,
    ];
    expect(visited).toEqual(expected);
    expect(visited).toHaveLength(27);
  });
});
