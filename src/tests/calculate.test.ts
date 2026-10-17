import { describe, expect, it } from 'vitest';
import {
  STEP_ORDER,
  buildPathIndices,
  buildStep,
  calculatePalace,
  calculateThreeSteps,
  createDivinationResult,
  summarizeSteps,
} from '../features/divination/calculate';
import {
  ALGORITHM_ID,
  ALGORITHM_VERSION,
  ORIGIN_INDEX,
  PALACES,
  PALACE_COUNT,
  PALACE_META,
  getPalaceMeta,
} from '../features/divination/palaceConstants';
import {
  BASE_MOVE_MS,
  LANDING_DWELL_MS,
  flattenFrames,
  moveIntervalMs,
  playbackPlan,
} from '../features/divination/buildPath';
import { CELL_LAYOUT } from '../features/divination/palmLayout';

describe('九宫常量', () => {
  it('九宫名称与顺序为：大安 留连 速喜 赤口 小吉 空亡 病符 桃花 天德', () => {
    expect(PALACES).toEqual(['大安', '留连', '速喜', '赤口', '小吉', '空亡', '病符', '桃花', '天德']);
    expect(PALACE_COUNT).toBe(9);
  });

  it('病符、桃花、天德是正式宫位（索引 6 / 7 / 8），而非附加神煞', () => {
    expect(getPalaceMeta(6).name).toBe('病符');
    expect(getPalaceMeta(7).name).toBe('桃花');
    expect(getPalaceMeta(8).name).toBe('天德');
    expect(PALACE_META).toHaveLength(9);
  });

  it('九宫与指节对照与需求文档一致', () => {
    const table = [
      [0, '食指', '中节指骨'],
      [1, '食指', '远节指骨'],
      [2, '中指', '远节指骨'],
      [3, '无名指', '中节指骨'],
      [4, '中指', '近节指骨'],
      [5, '中指', '中节指骨'],
      [6, '无名指', '远节指骨'],
      [7, '食指', '近节指骨'],
      [8, '无名指', '近节指骨'],
    ] as const;
    const fingerLabels: Record<string, string> = { index: '食指', middle: '中指', ring: '无名指' };
    const segmentLabels: Record<string, string> = {
      distal: '远节指骨',
      middle: '中节指骨',
      proximal: '近节指骨',
    };
    table.forEach(([index, finger, segment]) => {
      const meta = getPalaceMeta(index);
      expect(fingerLabels[meta.finger]).toBe(finger);
      expect(segmentLabels[meta.segment]).toBe(segment);
    });
  });
});

describe('calculatePalace · 单步计算', () => {
  it('起宫本身计作第 1 位：(0, 1) → 大安', () => {
    expect(calculatePalace(0, 1)).toBe(0);
    expect(PALACES[calculatePalace(0, 1)]).toBe('大安');
  });

  it('大安起数 5 次 → 小吉', () => {
    expect(PALACES[calculatePalace(0, 5)]).toBe('小吉');
  });

  it('小吉起数 20 次 → 空亡', () => {
    expect(PALACES[calculatePalace(4, 20)]).toBe('空亡');
  });

  it('空亡起数 2 次 → 病符', () => {
    expect(PALACES[calculatePalace(5, 2)]).toBe('病符');
  });

  it('落在天德（索引 8）后再数 1 次回到大安', () => {
    expect(calculatePalace(8, 1)).toBe(8);
    expect(calculatePalace(8, 2)).toBe(0);
    expect(PALACES[calculatePalace(8, 2)]).toBe('大安');
  });

  it('公式为 (s + n - 1) mod 9，对全量组合一致', () => {
    for (let s = 0; s < 9; s += 1) {
      for (let n = 1; n <= 60; n += 1) {
        expect(calculatePalace(s, n)).toBe((s + n - 1) % 9);
      }
    }
  });

  it('非法入参抛出错误', () => {
    expect(() => calculatePalace(-1, 3)).toThrow();
    expect(() => calculatePalace(9, 3)).toThrow();
    expect(() => calculatePalace(1.5, 3)).toThrow();
    expect(() => calculatePalace(0, 0)).toThrow();
    expect(() => calculatePalace(0, -2)).toThrow();
    expect(() => calculatePalace(0, 2.5)).toThrow();
  });
});

describe('buildPathIndices · 路径生成', () => {
  it('路径长度等于计数', () => {
    [1, 2, 5, 12, 20, 30].forEach((count) => {
      expect(buildPathIndices(0, count)).toHaveLength(count);
      expect(buildPathIndices(7, count)).toHaveLength(count);
    });
  });

  it('路径首项等于起宫、末项等于落宫', () => {
    for (let s = 0; s < 9; s += 1) {
      for (let n = 1; n <= 40; n += 1) {
        const path = buildPathIndices(s, n);
        expect(path[0]).toBe(s);
        expect(path[path.length - 1]).toBe(calculatePalace(s, n));
      }
    }
  });

  it('路径按九宫顺序循环，步进恒为 1（模 9）', () => {
    const path = buildPathIndices(6, 14);
    for (let i = 1; i < path.length; i += 1) {
      expect(path[i]).toBe((path[i - 1] + 1) % 9);
    }
  });

  it('路径中每个索引都在 0-8 内', () => {
    buildPathIndices(3, 25).forEach((i) => {
      expect(Number.isInteger(i)).toBe(true);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThanOrEqual(8);
    });
  });
});

describe('🔴 强制验收案例：农历五月二十日、丑时，起数 5、20、2', () => {
  const result = calculateThreeSteps(5, 20, 2);

  it('依次得到 小吉 → 空亡 → 病符', () => {
    expect(result.steps.map((s) => PALACES[s.resultIndex])).toEqual(['小吉', '空亡', '病符']);
  });

  it('第一步：大安起数 5 次，落宫小吉', () => {
    expect(PALACES[result.steps[0].startIndex]).toBe('大安');
    expect(result.steps[0].inputNumber).toBe(5);
    expect(PALACES[result.steps[0].resultIndex]).toBe('小吉');
  });

  it('第二步：小吉起数 20 次，落宫空亡', () => {
    expect(PALACES[result.steps[1].startIndex]).toBe('小吉');
    expect(result.steps[1].inputNumber).toBe(20);
    expect(PALACES[result.steps[1].resultIndex]).toBe('空亡');
  });

  it('第三步：空亡起数 2 次，落宫病符', () => {
    expect(PALACES[result.steps[2].startIndex]).toBe('空亡');
    expect(result.steps[2].inputNumber).toBe(2);
    expect(PALACES[result.steps[2].resultIndex]).toBe('病符');
  });

  it('最终落宫为病符，总览文本为「小吉、空亡、病符」', () => {
    expect(result.finalIndex).toBe(6);
    expect(summarizeSteps(result)).toBe('小吉、空亡、病符');
  });

  it('路径长度分别为 5 / 20 / 2，且首末项正确', () => {
    expect(result.steps.map((s) => s.pathIndices.length)).toEqual([5, 20, 2]);
    result.steps.forEach((s) => {
      expect(s.pathIndices[0]).toBe(s.startIndex);
      expect(s.pathIndices[s.pathIndices.length - 1]).toBe(s.resultIndex);
    });
  });

  it('20 步路径完整：0→4 循环，末项索引 5', () => {
    const dayPath = result.steps[1].pathIndices;
    expect(dayPath.slice(0, 6)).toEqual([4, 5, 6, 7, 8, 0]);
    expect(dayPath[19]).toBe(5);
  });
});

describe('连续起宫规则', () => {
  const result = calculateThreeSteps(5, 20, 2);

  it('月份永远从大安（索引 0）起数', () => {
    for (let m = 1; m <= 12; m += 1) {
      const r = calculateThreeSteps(m, 12, 6);
      expect(r.steps[0].startIndex).toBe(ORIGIN_INDEX);
      expect(timeSafeName(r.steps[0].startIndex)).toBe('大安');
    }
  });

  it('日期起宫等于月份最终宫位', () => {
    for (let m = 1; m <= 12; m += 1) {
      for (let d = 1; d <= 30; d += 5) {
        const r = calculateThreeSteps(m, d, 3);
        expect(r.steps[1].startIndex).toBe(r.steps[0].resultIndex);
      }
    }
  });

  it('时辰起宫等于日期最终宫位', () => {
    for (let d = 1; d <= 30; d += 4) {
      for (let h = 1; h <= 12; h += 3) {
        const r = calculateThreeSteps(4, d, h);
        expect(r.steps[2].startIndex).toBe(r.steps[1].resultIndex);
      }
    }
  });

  it('三步步骤名固定为 month / day / hour', () => {
    expect(result.steps.map((s) => s.step)).toEqual(['month', 'day', 'hour']);
    expect(STEP_ORDER).toEqual(['month', 'day', 'hour']);
  });

  it('相同输入重复计算结果完全一致', () => {
    const a = calculateThreeSteps(5, 20, 2);
    const b = calculateThreeSteps(5, 20, 2);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('越界输入抛出错误（月>12 / 日>30 / 时>12）', () => {
    expect(() => calculateThreeSteps(13, 1, 1)).toThrow();
    expect(() => calculateThreeSteps(1, 31, 1)).toThrow();
    expect(() => calculateThreeSteps(1, 1, 13)).toThrow();
  });
});

describe('结果对象', () => {
  it('固定算法 id 与版本', () => {
    const r = createDivinationResult({ mode: 'birth', month: 5, day: 20, hour: 2 }, 1700000000000);
    expect(r.input.algorithmId).toBe(ALGORITHM_ID);
    expect(r.input.algorithmVersion).toBe(ALGORITHM_VERSION);
    expect(r.createdAt).toBe(1700000000000);
    expect(r.finalIndex).toBe(6);
  });
});

describe('动画与算法解耦（视觉改动不得改变结果）', () => {
  const baseline = JSON.stringify(calculateThreeSteps(5, 20, 2));

  it('不同的动画节奏不改变结果', () => {
    const slow = playbackPlan(createDivinationResult({ mode: 'birth', month: 5, day: 20, hour: 2 }), {
      speed: 0.5,
      reducedMotion: false,
    });
    const fast = playbackPlan(createDivinationResult({ mode: 'birth', month: 5, day: 20, hour: 2 }), {
      speed: 2,
      reducedMotion: true,
    });
    expect(slow.totalMs).not.toBe(fast.totalMs);
    expect(JSON.stringify(calculateThreeSteps(5, 20, 2))).toBe(baseline);
  });

  it('掌位图坐标配置与宫位一一对应，且不参与计算', () => {
    expect(CELL_LAYOUT).toHaveLength(9);
    CELL_LAYOUT.forEach((cell, index) => {
      expect(cell.index).toBe(index);
      expect(cell.palaceId).toBe(PALACE_META[index].id);
      expect(cell.width).toBeGreaterThan(0);
      expect(cell.height).toBeGreaterThan(0);
    });
    expect(JSON.stringify(calculateThreeSteps(5, 20, 2))).toBe(baseline);
  });

  it('摊平后的动画帧逐帧对应算法路径', () => {
    const result = calculateThreeSteps(5, 20, 2);
    const frames = flattenFrames(result.steps);
    expect(frames).toHaveLength(5 + 20 + 2);
    frames.forEach((frame) => {
      expect(frame.palaceIndex).toBe(result.steps[frame.stepIndex].pathIndices[frame.cursor]);
    });
    // 帧序列与"直接拼接三条路径"完全一致
    expect(frames.map((f) => f.palaceIndex)).toEqual([
      ...result.steps[0].pathIndices,
      ...result.steps[1].pathIndices,
      ...result.steps[2].pathIndices,
    ]);
    // 落宫帧标记数量等于步数
    expect(frames.filter((f) => f.isLanding)).toHaveLength(3);
  });
});

describe('动画节奏', () => {
  it('末段减速：接近落宫时单次移动更慢', () => {
    const options = { speed: 1, reducedMotion: false };
    const far = moveIntervalMs(20, options);
    const near = moveIntervalMs(1, options);
    expect(near).toBeGreaterThan(far);
  });

  it('速度倍率生效，且不低于下限', () => {
    const base = moveIntervalMs(20, { speed: 1, reducedMotion: false });
    expect(moveIntervalMs(20, { speed: 2, reducedMotion: false })).toBeLessThan(base);
    expect(moveIntervalMs(20, { speed: 0.5, reducedMotion: false })).toBeGreaterThan(base);
    expect(moveIntervalMs(20, { speed: 100, reducedMotion: false })).toBeGreaterThanOrEqual(40);
  });

  it('减少动效模式下节奏显著缩短但仍保留可读间隔', () => {
    const reduced = moveIntervalMs(20, { speed: 1, reducedMotion: true });
    expect(reduced).toBeGreaterThan(0);
    expect(reduced).toBeLessThan(BASE_MOVE_MS);
    expect(LANDING_DWELL_MS).toBeGreaterThan(0);
  });

  it('单步间隔数量等于计数减一', () => {
    const plan = playbackPlan(createDivinationResult({ mode: 'birth', month: 5, day: 20, hour: 2 }), {
      speed: 1,
      reducedMotion: false,
    });
    expect(plan.perStep[0].intervals).toHaveLength(4);
    expect(plan.perStep[1].intervals).toHaveLength(19);
    expect(plan.perStep[2].intervals).toHaveLength(1);
  });
});

describe('buildStep', () => {
  it('构造的步骤对象自洽', () => {
    const step = buildStep('day', 4, 20);
    expect(step.step).toBe('day');
    expect(step.startIndex).toBe(4);
    expect(step.resultIndex).toBe(5);
    expect(step.pathIndices).toHaveLength(20);
  });
});

/** 小工具：只用于断言可读性 */
function timeSafeName(index: number): string {
  return PALACES[index];
}
