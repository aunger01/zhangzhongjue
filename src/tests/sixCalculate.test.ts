/**
 * 六宫小六壬 · 算法与释义测试
 *
 * 🔴 黄金用例全部取自《小六壬精华》原文例题（六宫小六壬.pdf 第 4~5 页），
 *    期望值逐字照录，不允许按实现反推。任何改动导致下列三例不符，即为算法错。
 */

import { describe, expect, it } from 'vitest';
import {
  SIX_DEFAULT_ORIGIN_INDEX,
  SIX_LUCKY_NUMBERS,
  SIX_ODD_NUMBERS,
  SIX_PALACE_COUNT,
  SIX_PALACE_META,
  SIX_PALACES,
  SIX_PERSON_ORIGIN,
  SIX_TOPICS,
  SIX_TOPIC_VERSES,
  SIX_UNLUCKY_NUMBERS,
  SIX_VERSE_TOPIC_LABELS,
  getSixPalaceMeta,
  getSixTopic,
  sixPalaceIndex,
} from '../features/six/sixConstants';
import {
  SIX_REPORT_MAX,
  SIX_REPORT_MIN,
  createSixResult,
  sixBuildPathIndices,
  sixCalculatePalace,
  sixCalculateThreeSteps,
  sixReduceReportNumber,
  sixSummarizeSteps,
} from '../features/six/sixCalculate';
import { SIX_CELL_LAYOUT } from '../features/six/sixLayout';
import {
  SIX_ELEMENT_CASES,
  SIX_PALACE_READINGS,
  sixComposeInterpretation,
  sixElementRelation,
  sixNumberNote,
  sixResolveYongshenIndex,
} from '../features/six/sixMeanings';

describe('六宫常量', () => {
  it('六宫名称与顺序为：大安 留连 速喜 赤口 小吉 空亡', () => {
    expect(SIX_PALACES).toEqual(['大安', '留连', '速喜', '赤口', '小吉', '空亡']);
    expect(SIX_PALACE_COUNT).toBe(6);
    expect(SIX_PALACE_META).toHaveLength(6);
  });

  it('六宫掌位依原文：大安食指根、留连食指尖、速喜中指尖、赤口无名指尖、小吉无名指根、空亡中指根', () => {
    const table = [
      [0, '食指', '近节指骨'],
      [1, '食指', '远节指骨'],
      [2, '中指', '远节指骨'],
      [3, '无名指', '远节指骨'],
      [4, '无名指', '近节指骨'],
      [5, '中指', '近节指骨'],
    ] as const;
    const fingerLabels: Record<string, string> = { index: '食指', middle: '中指', ring: '无名指' };
    const segmentLabels: Record<string, string> = {
      distal: '远节指骨',
      middle: '中节指骨',
      proximal: '近节指骨',
    };
    table.forEach(([index, finger, segment]) => {
      const meta = getSixPalaceMeta(index);
      expect(meta.index).toBe(index);
      expect(fingerLabels[meta.finger]).toBe(finger);
      expect(segmentLabels[meta.segment]).toBe(segment);
    });
  });

  it('六宫不承载中间指节：只有根 / 尖两节被占用', () => {
    const segments = SIX_PALACE_META.map((palace) => palace.segment);
    expect(segments.filter((segment) => segment === 'middle')).toHaveLength(0);
    expect(segments.filter((segment) => segment === 'proximal')).toHaveLength(3);
    expect(segments.filter((segment) => segment === 'distal')).toHaveLength(3);
  });

  it('五行、方位、临神、谋事日、断词均与原文一致', () => {
    expect(getSixPalaceMeta(0)).toMatchObject({
      name: '大安',
      element: '木',
      direction: '东方',
      guardian: '青龙',
      days: '一、四、七日',
    });
    expect(getSixPalaceMeta(1)).toMatchObject({ name: '留连', element: '水', guardian: '玄武' });
    expect(getSixPalaceMeta(2)).toMatchObject({ name: '速喜', element: '火', guardian: '朱雀' });
    expect(getSixPalaceMeta(3)).toMatchObject({ name: '赤口', element: '金', guardian: '白虎' });
    expect(getSixPalaceMeta(4)).toMatchObject({ name: '小吉', element: '木', guardian: '六合' });
    expect(getSixPalaceMeta(5)).toMatchObject({ name: '空亡', element: '土', guardian: '勾陈' });
    SIX_PALACE_META.forEach((palace) => {
      expect(palace.verse).toHaveLength(4);
      expect(palace.verse.join('').length).toBeGreaterThan(24);
      expect(palace.keywords.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('六宫掌位图坐标与宫位一一对应（视觉层可独立调整，不参与计算）', () => {
    expect(SIX_CELL_LAYOUT).toHaveLength(6);
    SIX_CELL_LAYOUT.forEach((cell, index) => {
      const meta = getSixPalaceMeta(index);
      expect(cell.index).toBe(index);
      expect(cell.palaceId).toBe(meta.id);
      expect(cell.finger).toBe(meta.finger);
      expect(cell.segment).toBe(meta.segment);
      expect(cell.width).toBeGreaterThan(0);
      expect(cell.height).toBeGreaterThan(0);
    });
  });

  it('起宫索引越界或非整数时报错', () => {
    expect(() => getSixPalaceMeta(-1)).toThrow();
    expect(() => getSixPalaceMeta(6)).toThrow();
    expect(() => sixPalaceIndex('病符' as never)).toThrow();
  });
});

describe('起宫依据：事类起课与占人起课', () => {
  it('事由起宫依起课歌诀：通用/婚姻→大安、求财→留连、疾病→速喜、官司→赤口、出行→小吉', () => {
    expect(getSixTopic('general').origin).toBe('大安');
    expect(getSixTopic('marriage')).toMatchObject({ origin: '大安', palaceLabel: '官喜宫' });
    expect(getSixTopic('wealth')).toMatchObject({ origin: '留连', palaceLabel: '财帛宫' });
    expect(getSixTopic('illness')).toMatchObject({ origin: '速喜', palaceLabel: '寿宫' });
    expect(getSixTopic('lawsuit')).toMatchObject({ origin: '赤口', palaceLabel: '监察宫' });
    expect(getSixTopic('travel')).toMatchObject({ origin: '小吉', palaceLabel: '驿马宫' });
  });

  it('空亡不起课：没有任何事由或占人以空亡起宫', () => {
    expect(SIX_TOPICS.every((topic) => topic.origin !== '空亡')).toBe(true);
    expect(SIX_PERSON_ORIGIN.female.origin).not.toBe('空亡');
    expect(SIX_PERSON_ORIGIN.male.origin).not.toBe('空亡');
  });

  it('占人起课：女起重阴起留连，男起重阳起小吉', () => {
    expect(sixPalaceIndex(SIX_PERSON_ORIGIN.female.origin)).toBe(1);
    expect(sixPalaceIndex(SIX_PERSON_ORIGIN.male.origin)).toBe(4);
  });

  it('通用问事的默认起宫为大安', () => {
    expect(SIX_DEFAULT_ORIGIN_INDEX).toBe(0);
    expect(SIX_PALACES[SIX_DEFAULT_ORIGIN_INDEX]).toBe('大安');
  });
});

describe('六宫落宫算法（模 6）', () => {
  it('单步公式为 (startIndex + count - 1) mod 6', () => {
    for (let start = 0; start < SIX_PALACE_COUNT; start += 1) {
      for (let count = 1; count <= 24; count += 1) {
        expect(sixCalculatePalace(start, count)).toBe((start + count - 1) % 6);
      }
    }
  });

  it('计数路径首项为起宫、末项为落宫、步进恒为 1（模 6 循环）', () => {
    for (let start = 0; start < SIX_PALACE_COUNT; start += 1) {
      for (let count = 1; count <= 15; count += 1) {
        const path = sixBuildPathIndices(start, count);
        expect(path).toHaveLength(count);
        expect(path[0]).toBe(start);
        expect(path[path.length - 1]).toBe(sixCalculatePalace(start, count));
        path.forEach((value, index) => {
          expect(value).toBe((start + index) % 6);
        });
      }
    }
  });

  it('六宫与九宫在同一输入下可以给出不同落宫（宫制彼此独立）', () => {
    // 九宫：(0 + 6 - 1) % 9 = 5；六宫：(0 + 6 - 1) % 6 = 5 → 同为第五位，但第 7 位起分道扬镳
    expect(sixCalculatePalace(0, 7)).toBe(0);
    expect((0 + 7 - 1) % 9).toBe(6);
  });

  it('非法输入一律报错，不静默兜底', () => {
    expect(() => sixCalculatePalace(6, 1)).toThrow();
    expect(() => sixCalculatePalace(0, 0)).toThrow();
    expect(() => sixCalculatePalace(0, 1.5)).toThrow();
    expect(() => sixCalculateThreeSteps(0, 13, 1, 1)).toThrow();
    expect(() => sixCalculateThreeSteps(0, 1, 31, 1)).toThrow();
    expect(() => sixCalculateThreeSteps(0, 1, 1, 13)).toThrow();
  });
});

describe('🔴 黄金用例：《小六壬精华》原文例题', () => {
  it('婚姻例：大安起课，三月初三卯时 → 月速喜、日小吉、时留连', () => {
    const result = sixCalculateThreeSteps(0, 3, 3, 4);
    expect(sixSummarizeSteps(result)).toBe('速喜、小吉、留连');
    expect(result.steps.map((step) => step.startIndex)).toEqual([0, 2, 4]);
  });

  it('占人女例：留连起课，三月初三卯时 → 月赤口、日空亡、时速喜', () => {
    const result = sixCalculateThreeSteps(1, 3, 3, 4);
    expect(sixSummarizeSteps(result)).toBe('赤口、空亡、速喜');
    expect(result.steps.map((step) => step.startIndex)).toEqual([1, 3, 5]);
  });

  it('占人男例：小吉起课，三月初三卯时 → 月大安、日速喜、时空亡', () => {
    const result = sixCalculateThreeSteps(4, 3, 3, 4);
    expect(sixSummarizeSteps(result)).toBe('大安、速喜、空亡');
    expect(result.steps.map((step) => step.startIndex)).toEqual([4, 0, 2]);
  });

  it('三例互不相同的落宫，证明起宫确实改变了结果（不是固定从大安起）', () => {
    const a = sixSummarizeSteps(sixCalculateThreeSteps(0, 3, 3, 4));
    const b = sixSummarizeSteps(sixCalculateThreeSteps(1, 3, 3, 4));
    const c = sixSummarizeSteps(sixCalculateThreeSteps(4, 3, 3, 4));
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe('变通取数：自报三数的归约', () => {
  it('归约到 1~12', () => {
    expect(sixReduceReportNumber(1)).toBe(1);
    expect(sixReduceReportNumber(12)).toBe(12);
    expect(sixReduceReportNumber(13)).toBe(1);
    expect(sixReduceReportNumber(99)).toBe(3);
  });

  it('归约不改变落宫（12 是 6 的倍数）：全量比对 1~99', () => {
    for (let start = 0; start < SIX_PALACE_COUNT; start += 1) {
      for (let value = SIX_REPORT_MIN; value <= SIX_REPORT_MAX; value += 1) {
        const reduced = sixReduceReportNumber(value);
        expect(sixCalculatePalace(start, reduced)).toBe(sixCalculatePalace(start, value));
      }
    }
  });

  it('超出范围或非整数报错', () => {
    expect(() => sixReduceReportNumber(0)).toThrow();
    expect(() => sixReduceReportNumber(100)).toThrow();
    expect(() => sixReduceReportNumber(3.5)).toThrow();
  });

  it('单双阴阳与吉凶数取自原文', () => {
    expect(SIX_ODD_NUMBERS).toEqual([1, 3, 5, 7, 9]);
    expect(SIX_LUCKY_NUMBERS).toEqual([1, 3, 5, 6, 7, 8]);
    expect(SIX_UNLUCKY_NUMBERS).toEqual([2, 4, 9, 10]);
  });
});

describe('结果对象', () => {
  it('固定算法标识、起宫信息与三步结构', () => {
    const createdAt = 1_700_000_000_000;
    const result = createSixResult({
      originIndex: 1,
      originLabel: '占人（女）· 留连起课',
      month: 3,
      day: 3,
      hour: 4,
      numbersNote: '农历三月初三 · 卯时',
      createdAt,
    });
    expect(result.input).toMatchObject({
      mode: 'six',
      originIndex: 1,
      originName: '留连',
      originLabel: '占人（女）· 留连起课',
      numbersSource: 'calendar',
      algorithmId: 'liugong-xiaoliuren',
      algorithmVersion: '1.0.0',
    });
    expect(result.createdAt).toBe(createdAt);
    expect(result.steps).toHaveLength(3);
    expect(result.steps.map((step) => step.step)).toEqual(['month', 'day', 'hour']);
    expect(result.finalIndex).toBe(result.steps[2].resultIndex);
    expect(sixSummarizeSteps(result)).toBe('赤口、空亡、速喜');
  });

  it('结构兼容九宫状态机：steps 均带路径、且路径长度等于起数', () => {
    const result = createSixResult({
      originIndex: 4,
      originLabel: '占人（男）· 小吉起课',
      month: 3,
      day: 3,
      hour: 4,
      numbersNote: '农历三月初三 · 卯时',
    });
    result.steps.forEach((step) => {
      expect(step.pathIndices).toHaveLength(step.inputNumber);
      expect(step.pathIndices[step.pathIndices.length - 1]).toBe(step.resultIndex);
      expect(step.pathIndices[0]).toBe(step.startIndex);
    });
  });

  it('缺省起宫为大安', () => {
    const result = createSixResult({
      originLabel: '通用问事',
      month: 1,
      day: 1,
      hour: 1,
      numbersNote: '农历正月初一 · 子时',
    });
    expect(result.input.originName).toBe('大安');
    // 起数全为 1：每一步都停在起宫本身，故三宫皆大安
    expect(sixSummarizeSteps(result)).toBe('大安、大安、大安');
  });
});

describe('六宫释义', () => {
  it('六宫释义全部配置齐全，且字段非空', () => {
    SIX_PALACES.forEach((name) => {
      const reading = SIX_PALACE_READINGS[name];
      expect(reading.summary.length).toBeGreaterThan(6);
      expect(reading.asMonth.length).toBeGreaterThan(6);
      expect(reading.asDay.length).toBeGreaterThan(6);
      expect(reading.asHour.length).toBeGreaterThan(6);
      expect(reading.advice.length).toBeGreaterThanOrEqual(2);
      expect(reading.cautions.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('五行生克判定覆盖同、生、克两向', () => {
    expect(sixElementRelation('木', '木')).toBe('same');
    expect(sixElementRelation('木', '火')).toBe('self-generates');
    expect(sixElementRelation('木', '土')).toBe('self-controls');
    expect(sixElementRelation('木', '水')).toBe('other-generates');
    expect(sixElementRelation('木', '金')).toBe('other-controls');
  });

  it('数字释义区分阴阳与 1~10 范围', () => {
    expect(sixNumberNote(3)).toContain('单数为阳');
    expect(sixNumberNote(3)).toContain('吉祥');
    expect(sixNumberNote(4)).toContain('双数为阴');
    expect(sixNumberNote(11)).toContain('超出 1~10 释义范围');
  });

  it('🔴 大于 10 的自报数按奇偶性判阴阳（15/27 为单数阳，非白名单误判）', () => {
    // 圣上实测发现：15、27 曾被白名单误判为「双数」
    expect(sixNumberNote(15)).toContain('单数为阳');
    expect(sixNumberNote(27)).toContain('单数为阳');
    expect(sixNumberNote(18)).toContain('双数为阴');
    expect(sixNumberNote(21)).toContain('单数为阳');
    expect(sixNumberNote(12)).toContain('双数为阴');
    // 1~10 范围内判定不变
    expect(sixNumberNote(7)).toContain('单数为阳');
    expect(sixNumberNote(10)).toContain('双数为阴');
  });

  it('五行取事五条齐备', () => {
    expect(SIX_ELEMENT_CASES).toHaveLength(5);
    expect(SIX_ELEMENT_CASES.map((item) => item.title)).toEqual([
      '木逢旺金有凶灾',
      '旺金遇火有凶伤',
      '旺土挡水走不顺',
      '木入旺土是牢狱',
      '水来克火有病灾',
    ]);
  });

  it('解读合成输出完整，且三宫断词随落宫对应', () => {
    const result = createSixResult({
      originIndex: 1,
      originLabel: '占人（女）· 留连起课',
      month: 3,
      day: 3,
      hour: 4,
      numbersNote: '农历三月初三 · 卯时',
    });
    const interpretation = sixComposeInterpretation(result, {
      inputSummary: '农历三月初三 · 卯时',
      originLabel: '占人（女）· 留连起课',
      numberNotes: [sixNumberNote(8)],
    });

    expect(interpretation.steps.map((step) => step.palaceName)).toEqual(['赤口', '空亡', '速喜']);
    expect(interpretation.verses).toHaveLength(3);
    expect(interpretation.verses[0].lines).toEqual(getSixPalaceMeta(3).verse);
    expect(interpretation.headline).toContain('速喜');
    expect(interpretation.overall).toContain('留连起课');
    expect(interpretation.yongshen.notes.length).toBeGreaterThan(0);
    expect(interpretation.yongshen.basis.length).toBeGreaterThan(6);
    expect(interpretation.numberNotes).toHaveLength(1);
    expect(interpretation.positives.length).toBeGreaterThanOrEqual(1);
    expect(interpretation.cautions.length).toBeGreaterThanOrEqual(1);
    expect(interpretation.advice.length).toBeGreaterThanOrEqual(2);
    expect(interpretation.shareText).toContain('六宫小六壬');
    expect(interpretation.shareText).toContain('月宫 赤口 · 日宫 空亡 · 时宫 速喜');
  });

  it('三宫五行同类时给出同类所主提示', () => {
    // 找一组三宫同五行的输入（枚举全部起宫与月日时）
    let found = false;
    for (let origin = 0; origin < 6 && !found; origin += 1) {
      for (let month = 1; month <= 12 && !found; month += 1) {
        for (let day = 1; day <= 30 && !found; day += 1) {
          for (let hour = 1; hour <= 12 && !found; hour += 1) {
            const result = createSixResult({
              originIndex: origin,
              originLabel: '通用问事',
              month,
              day,
              hour,
              numbersNote: '测试',
            });
            const elements = result.steps.map((step) => getSixPalaceMeta(step.resultIndex).element);
            if (elements[0] === elements[1] && elements[1] === elements[2]) {
              const interpretation = sixComposeInterpretation(result, {
                inputSummary: '测试',
                originLabel: '通用问事',
              });
              expect(interpretation.sameElementNote.length).toBeGreaterThan(6);
              found = true;
            }
          }
        }
      }
    }
    expect(found).toBe(true);
  });
});

describe('🔴 文案依转录底本：标点齐全、不复用九宫、免责只出现一次', () => {
  it('六宫断词四句均带句末标点，拼接后不缺标点', () => {
    SIX_PALACE_META.forEach((palace) => {
      expect(palace.verse).toHaveLength(4);
      palace.verse.forEach((line) => {
        expect(line).toMatch(/[；。]$/);
      });
      expect(palace.verse[3].endsWith('。')).toBe(true);
      const joined = palace.verse.join('');
      // 每句应为「七言，七言；」结构：整段至少含 7 个标点，不应出现连续两句之间无标点
      expect((joined.match(/[，；。]/g) ?? []).length).toBeGreaterThanOrEqual(7);
      expect(joined).toContain('，');
    });
    // 逐字核对底本第 2 页小吉断词（圣上指出缺标点的那一条）
    expect(getSixPalaceMeta(4).verse.join('')).toBe(
      '小吉最吉昌，路上好商量；阴人来报喜，失物在坤方；行人即便至，交易甚是强；凡事皆和合，病者祈上苍。',
    );
  });

  it('断课歌诀五事由 × 六宫齐备，且与底本第 6~7 页一致', () => {
    const topics = Object.keys(SIX_TOPIC_VERSES) as Array<keyof typeof SIX_TOPIC_VERSES>;
    expect(topics).toHaveLength(5);
    topics.forEach((topicId) => {
      expect(SIX_VERSE_TOPIC_LABELS[topicId].length).toBeGreaterThan(0);
      SIX_PALACES.forEach((palace) => {
        const verse = SIX_TOPIC_VERSES[topicId][palace];
        expect(verse.length).toBeGreaterThan(10);
        expect(verse).toContain('，');
      });
    });
    expect(SIX_TOPIC_VERSES.wealth['速喜']).toBe('财占速喜九分财，若要得全贵人帮');
    expect(SIX_TOPIC_VERSES.marriage['赤口']).toBe('婚占赤口婚不吉，棒打鸳鸯各一方');
    expect(SIX_TOPIC_VERSES.illness['空亡']).toBe('病占空亡为无病，有病可能是癔病');
    expect(SIX_TOPIC_VERSES.lawsuit['小吉']).toBe('官司小吉要答礼，舍财保身得平安');
    expect(SIX_TOPIC_VERSES.travel['大安']).toBe('大安外出不宜远，不求财来可以走');
  });

  it('用神取法依底本：占事以宫位取用神，通用与占人以日宫为用神', () => {
    expect(sixResolveYongshenIndex('marriage', 0)).toBe(0);
    expect(sixResolveYongshenIndex('wealth', 0)).toBe(1);
    expect(sixResolveYongshenIndex('illness', 0)).toBe(2);
    expect(sixResolveYongshenIndex('lawsuit', 0)).toBe(3);
    expect(sixResolveYongshenIndex('travel', 0)).toBe(4);
    // 通用问事 / 占人：以日宫为用神（不因起宫改变）
    expect(sixResolveYongshenIndex('general', 3)).toBe(3);
    expect(sixResolveYongshenIndex(null, 5)).toBe(5);
  });

  it('求财落速喜的解读引本课歌诀，且用神取留连', () => {
    const result = createSixResult({
      originIndex: 1,
      originLabel: '求财经商（财帛宫·留连）',
      topicId: 'wealth',
      month: 3,
      day: 3,
      hour: 4,
      numbersNote: '农历三月初三 · 卯时',
    });
    const interpretation = sixComposeInterpretation(result, {
      inputSummary: '农历三月初三 · 卯时',
      originLabel: '求财经商（财帛宫·留连）',
      topicId: 'wealth',
    });

    expect(interpretation.steps.map((step) => step.palaceName)).toEqual(['赤口', '空亡', '速喜']);
    expect(interpretation.topicVerses).toHaveLength(3);
    expect(interpretation.topicVerses[0].verse).toBe('财占赤口一口财，辛辛苦苦才能赚到');
    expect(interpretation.topicVerses[2].verse).toBe('财占速喜九分财，若要得全贵人帮');
    expect(interpretation.yongshen.palaceName).toBe('留连');
    expect(interpretation.yongshen.basis).toContain('以宫位取用神');
    expect(interpretation.shareText).toContain('断课歌诀');
    expect(interpretation.shareText).toContain('财占速喜九分财');
  });

  it('通用问事不产生歌诀；占人起课亦无歌诀', () => {
    const result = createSixResult({
      originLabel: '通用问事',
      topicId: 'general',
      month: 3,
      day: 3,
      hour: 4,
      numbersNote: '农历三月初三 · 卯时',
    });
    const interpretation = sixComposeInterpretation(result, {
      inputSummary: '农历三月初三 · 卯时',
      originLabel: '通用问事',
      topicId: 'general',
    });
    expect(interpretation.topicVerses).toHaveLength(0);
    expect(interpretation.yongshen.basis).toContain('日宫');
  });

  it('免责声明全页只出现一次，且为六宫专属文案（不提九宫、不逐条重复法律提示）', () => {
    const result = createSixResult({
      originIndex: 1,
      originLabel: '占人（女）· 留连起课',
      month: 3,
      day: 3,
      hour: 4,
      numbersNote: '农历三月初三 · 卯时',
    });
    const interpretation = sixComposeInterpretation(result, {
      inputSummary: '农历三月初三 · 卯时',
      originLabel: '占人（女）· 留连起课',
    });

    expect(interpretation.disclaimer).toContain('六宫小六壬');
    expect(interpretation.disclaimer).not.toContain('九宫');
    // 赤口落在本局（月位），旧版会把「法律判断 / 咨询专业人士」塞进每条留意项
    expect(interpretation.cautions.some((item) => item.includes('赤口'))).toBe(true);
    const repeated = interpretation.cautions.filter(
      (item) => item.includes('法律判断') || item.includes('咨询专业人士'),
    );
    expect(repeated).toHaveLength(0);
    // 留意项不得出现「月位赤口：月起赤口：」式的双重前缀
    interpretation.cautions.forEach((item) => {
      expect(item).not.toMatch(/位[^：]{2,4}：[月日时]起/);
    });
  });
});
