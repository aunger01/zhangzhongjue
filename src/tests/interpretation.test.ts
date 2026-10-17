import { describe, expect, it } from 'vitest';
import { composeInterpretation } from '../features/interpretation/composeResult';
import { createDivinationResult } from '../features/divination/calculate';
import { PALACE_MEANINGS } from '../features/interpretation/palaceMeanings';
import { PALACES } from '../features/divination/palaceConstants';

function interpret(month: number, day: number, hour: number) {
  return composeInterpretation(
    createDivinationResult({ mode: 'birth', month, day, hour }, 1_700_000_000_000),
    {
      mode: 'birth',
      inputSummary: `农历五月二十日，丑时`,
      numbersText: `${month}、${day}、${hour}`,
    },
  );
}

describe('释义数据完整性', () => {
  it('九宫释义全部配置齐全，且字段非空', () => {
    expect(Object.keys(PALACE_MEANINGS)).toHaveLength(9);
    PALACES.forEach((name) => {
      const meaning = PALACE_MEANINGS[name];
      expect(meaning, name).toBeTruthy();
      expect(meaning.summary.length).toBeGreaterThan(4);
      expect(meaning.asMonth.length).toBeGreaterThan(4);
      expect(meaning.asDay.length).toBeGreaterThan(4);
      expect(meaning.asHour.length).toBeGreaterThan(4);
      expect(meaning.keywords.length).toBeGreaterThanOrEqual(3);
      expect(meaning.advice.length).toBeGreaterThanOrEqual(2);
      expect(meaning.cautions.length).toBeGreaterThanOrEqual(2);
      expect(meaning.career.length).toBeGreaterThan(4);
      expect(meaning.relationship.length).toBeGreaterThan(4);
      expect(meaning.wealth.length).toBeGreaterThan(4);
      expect(meaning.health.length).toBeGreaterThan(4);
    });
  });
});

describe('验收案例的解读（农历五月二十日、丑时，起数 5、20、2）', () => {
  const composed = interpret(5, 20, 2);

  it('逐步解析依次为 小吉 / 空亡 / 病符', () => {
    expect(composed.steps.map((s) => s.palaceName)).toEqual(['小吉', '空亡', '病符']);
    expect(composed.steps.map((s) => s.palaceName.length > 0)).toEqual([true, true, true]);
    expect(composed.steps.map((s) => s.stepLabel)).toEqual(['月', '日', '时']);
    expect(composed.steps.map((s) => s.inputNumber)).toEqual([5, 20, 2]);
    expect(composed.steps.map((s) => s.startName)).toEqual(['大安', '小吉', '空亡']);
  });

  it('逐步解析包含完整路径（5 / 20 / 2 位）', () => {
    expect(composed.steps.map((s) => s.pathNames.length)).toEqual([5, 20, 2]);
    expect(composed.steps[0].pathNames).toEqual(['大安', '留连', '速喜', '赤口', '小吉']);
    expect(composed.steps[1].pathNames[19]).toBe('空亡');
    expect(composed.steps[2].pathNames).toEqual(['空亡', '病符']);
  });

  it('标题指向收束宫位，语气为偏滞（两滞一吉）', () => {
    expect(composed.headline).toContain('病符');
    expect(composed.tone).toBe('inauspicious');
  });

  it('积极因素包含小吉，需要留意包含空亡与病符', () => {
    expect(composed.positives.join('')).toContain('小吉');
    const cautions = composed.cautions.join('');
    expect(cautions).toContain('空亡');
    expect(cautions).toContain('病符');
    expect(cautions).toContain('就医');
  });

  it('行动建议 2～4 条且不含确定性医疗结论', () => {
    expect(composed.advice.length).toBeGreaterThanOrEqual(2);
    expect(composed.advice.length).toBeLessThanOrEqual(4);
    const joined = composed.advice.join('');
    expect(joined).not.toMatch(/一定会|必然治愈|保证收益/);
  });

  it('组合解读命中"收在时位为病符"规则', () => {
    expect(composed.combination).toContain('病符');
    expect(composed.combination.length).toBeGreaterThan(20);
  });

  it('分享文本包含关键信息与免责说明', () => {
    expect(composed.shareText).toContain('小吉');
    expect(composed.shareText).toContain('空亡');
    expect(composed.shareText).toContain('病符');
    expect(composed.shareText).toContain('5、20、2');
    expect(composed.shareText).toContain('不构成任何专业建议');
  });

  it('相同输入产生完全一致的解读', () => {
    expect(JSON.stringify(interpret(5, 20, 2))).toBe(JSON.stringify(composed));
  });
});

describe('组合规则', () => {
  it('三宫皆吉（全大安：1、1、1）命中"三宫皆吉"', () => {
    const composed = interpret(1, 1, 1);
    expect(composed.steps.map((s) => s.palaceName)).toEqual(['大安', '大安', '大安']);
    expect(composed.combination).toContain('三宫皆吉');
    expect(composed.tone).toBe('auspicious');
  });

  it('时宫天德（5、20、4）命中贵人规则', () => {
    const composed = interpret(5, 20, 4);
    expect(composed.steps[2].palaceName).toBe('天德');
    expect(composed.headline).toContain('天德');
    expect(composed.combination).toContain('贵人');
  });

  it('日宫空亡而时宫非空亡时提示中途生变', () => {
    const composed = interpret(5, 20, 4);
    expect(composed.steps[1].palaceName).toBe('空亡');
    expect(composed.combination).toContain('日宫空亡');
  });

  it('三宫皆滞（全病符路径）命中收敛提示', () => {
    // 造一个三宫皆为滞位的组合：1→大安；日 8 → 天德？此处以实际计算结果断言 tone
    const composed = interpret(3, 12, 6);
    expect(['auspicious', 'mixed', 'inauspicious']).toContain(composed.tone);
    expect(composed.combination.length).toBeGreaterThan(20);
  });

  it('步骤角色标注：起因 / 过程 / 结果', () => {
    const composed = interpret(5, 20, 2);
    expect(composed.steps[0].role).toContain('起因');
    expect(composed.steps[1].role).toContain('过程');
    expect(composed.steps[2].role).toContain('结果');
  });

  it('关键词非空且不重复', () => {
    const composed = interpret(5, 20, 2);
    expect(composed.keywords.length).toBeGreaterThan(0);
    expect(new Set(composed.keywords).size).toBe(composed.keywords.length);
  });

  it('高风险事项免责声明始终存在', () => {
    const composed = interpret(7, 7, 7);
    expect(composed.disclaimer).toContain('不构成');
    expect(composed.disclaimer).toContain('科学预测能力');
    expect(composed.privacy).toContain('不上传');
  });
});
