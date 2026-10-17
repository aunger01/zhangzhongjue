import { describe, expect, it } from 'vitest';
import {
  TEXT_HARD_MAX,
  TEXT_NUMBER_RANGE,
  countHanCharacters,
  extractHanCharacters,
  isHanCodePoint,
  normalizeNFC,
  normalizeToRange,
  sumCodePoints,
  sumSquaredCodePoints,
  textToNumbers,
  validateTextInput,
} from '../features/text/textNumbering';
import { calculateThreeSteps, createDivinationResult } from '../features/divination/calculate';
import { PALACES } from '../features/divination/palaceConstants';

describe('有效汉字提取', () => {
  it('忽略空格、换行、标点、数字、字母与表情符号', () => {
    const raw = '  求 问：2026 年 ABC，\n能否顺遂？😀🙏  ';
    const chars = extractHanCharacters(raw);
    expect(chars.join('')).toBe('求问年能否顺遂');
    expect(countHanCharacters(raw)).toBe(7);
  });

  it('纯空白文本有效字数为 0', () => {
    expect(countHanCharacters('   \n\t  ')).toBe(0);
    expect(countHanCharacters('？！，。、；：')).toBe(0);
    expect(countHanCharacters('1234567890')).toBe(0);
    expect(countHanCharacters('😀🎉🙏')).toBe(0);
  });

  it('同音异形与罕见字按码点正确计数', () => {
    expect(countHanCharacters('大安留连速喜')).toBe(6);
    expect(countHanCharacters('〇')).toBe(1);
    expect(countHanCharacters('𠮷')).toBe(1); // U+20BB7，扩展 B 区，代理对
  });

  it('代理对不会被拆成两个字符', () => {
    const chars = extractHanCharacters('𠮷');
    expect(chars).toHaveLength(1);
    expect(chars[0].codePointAt(0)).toBe(0x20bb7);
    expect(chars[0].length).toBe(2); // UTF-16 长度仍为 2，但按码点只有一个字符
  });

  it('码点判定覆盖基本区、扩展区与兼容区', () => {
    expect(isHanCodePoint(0x4e00)).toBe(true); // 一
    expect(isHanCodePoint(0x9fa5)).toBe(true);
    expect(isHanCodePoint(0x3400)).toBe(true); // 扩展 A 起点
    expect(isHanCodePoint(0x20000)).toBe(true); // 扩展 B 起点
    expect(isHanCodePoint(0x3007)).toBe(true); // 〇
    expect(isHanCodePoint(0x41)).toBe(false); // A
    expect(isHanCodePoint(0x31)).toBe(false); // 1
    expect(isHanCodePoint(0x1f600)).toBe(false); // 😀
    expect(isHanCodePoint(-1)).toBe(false);
  });

  it('NFC 规范化幂等，且兼容汉字统一形态后码点稳定', () => {
    expect(normalizeNFC('漢字')).toBe('漢字');
    expect(normalizeNFC(normalizeNFC('五月二十'))).toBe(normalizeNFC('五月二十'));
    const compat = '\uF900'; // 兼容汉字"豈"，NFC 会归一为 U+8C48
    expect(countHanCharacters(compat)).toBe(1);
    expect(extractHanCharacters(compat)[0]).toBe(compat.normalize('NFC'));
  });
});

describe('归一化到 1..12', () => {
  it('边界', () => {
    expect(TEXT_NUMBER_RANGE).toBe(12);
    expect(normalizeToRange(1)).toBe(1);
    expect(normalizeToRange(12)).toBe(12);
    expect(normalizeToRange(13)).toBe(1);
    expect(normalizeToRange(24)).toBe(12);
    expect(normalizeToRange(25)).toBe(1);
  });

  it('公式为 ((n - 1) mod range) + 1', () => {
    for (let n = 0; n <= 200; n += 1) {
      expect(normalizeToRange(n)).toBe(((n - 1) % 12) + 1);
    }
  });

  it('非法输入报错', () => {
    expect(() => normalizeToRange(-1)).toThrow();
    expect(() => normalizeToRange(1.5)).toThrow();
    expect(() => normalizeToRange(10, 0)).toThrow();
  });
});

describe('文字取数（A / B / C）', () => {
  it('A 为有效汉字数量、B 为码点之和、C 为码点平方之和', () => {
    const detail = textToNumbers('大安留连');
    expect(detail.count).toBe(4);
    expect(detail.codePointSum).toBe(
      0x5927 + 0x5b89 + 0x7559 + 0x8fde,
    );
    expect(detail.codePointSquareSum).toBe(
      0x5927 ** 2 + 0x5b89 ** 2 + 0x7559 ** 2 + 0x8fde ** 2,
    );
    expect(detail.numbers).toEqual([
      normalizeToRange(4),
      normalizeToRange(detail.codePointSum),
      normalizeToRange(detail.codePointSquareSum),
    ]);
  });

  it('手算校验一：单字「三」（U+4E09 = 19977）→ 1、9、9', () => {
    // A = 1                      → ((1-1) mod 12)+1 = 1
    // B = 19977 ≡ 9 (mod 12)     → ((9-1) mod 12)+1 = 9
    // C = 19977² ≡ 81 ≡ 9 (mod 12) → 9
    const detail = textToNumbers('三');
    expect(detail.codePointSum).toBe(19977);
    expect(detail.codePointSquareSum).toBe(19977 ** 2);
    expect(detail.numbers).toEqual([1, 9, 9]);
  });

  it('手算校验二：「田田」（各 U+7530 = 30000）→ 2、12、12', () => {
    // A = 2 → 2；B = 60000 ≡ 0 (mod 12) → 12；C = 2×30000² ≡ 0 (mod 12) → 12
    const detail = textToNumbers('田田');
    expect(detail.count).toBe(2);
    expect(detail.codePointSum).toBe(60000);
    expect(detail.codePointSquareSum).toBe(2 * 30000 ** 2);
    expect(detail.numbers).toEqual([2, 12, 12]);
  });

  it('相同文字总是产生相同三个数字', () => {
    const sample = '此事可否从速落定';
    const first = textToNumbers(sample).numbers;
    for (let i = 0; i < 200; i += 1) {
      expect(textToNumbers(sample).numbers).toEqual(first);
    }
  });

  it('标点与空格的差异不影响起数（规范化后一致）', () => {
    expect(textToNumbers('求问前程').numbers).toEqual(textToNumbers('求问，前程！').numbers);
    expect(textToNumbers(' 求 问 前 程 ').numbers).toEqual(textToNumbers('求问前程').numbers);
  });

  it('起数三值恒在 1..12', () => {
    const samples = ['一', '求问此事', '𠮷祥如意', '〇', '安杰导航站是否顺利', '一二三四五六七八九十'];
    samples.forEach((s) => {
      textToNumbers(s).numbers.forEach((n) => {
        expect(n).toBeGreaterThanOrEqual(1);
        expect(n).toBeLessThanOrEqual(12);
      });
    });
  });

  it('明细字段与最终数字自洽', () => {
    const detail = textToNumbers('落子无悔');
    expect(sumCodePoints(detail.hanCharacters)).toBe(detail.codePointSum);
    expect(sumSquaredCodePoints(detail.hanCharacters)).toBe(detail.codePointSquareSum);
    expect(detail.hanCharacters).toHaveLength(detail.count);
    expect(detail.numbers[0]).toBe(normalizeToRange(detail.count));
  });

  it('自定义范围可配置（配置项而非硬编码）', () => {
    const detail = textToNumbers('三', 9);
    expect(detail.range).toBe(9);
    detail.numbers.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(9);
    });
    expect(detail.numbers[0]).toBe(1);
  });
});

describe('文字输入校验', () => {
  it('空白无法提交', () => {
    expect(validateTextInput('').canSubmit).toBe(false);
    expect(validateTextInput('   ').canSubmit).toBe(false);
    expect(validateTextInput('？！。').canSubmit).toBe(false);
    expect(validateTextInput('').level).toBe('error');
  });

  it('不足 3 字仅提示，仍可提交', () => {
    const v = validateTextInput('测');
    expect(v.level).toBe('warn');
    expect(v.canSubmit).toBe(true);
    expect(v.count).toBe(1);
  });

  it('30 字以内为通过', () => {
    const v = validateTextInput('一二三四五六七八九十'.repeat(2));
    expect(v.level).toBe('ok');
    expect(v.canSubmit).toBe(true);
    expect(v.count).toBe(20);
  });

  it('超过 30 字提示精简但仍可提交', () => {
    const v = validateTextInput('安'.repeat(35));
    expect(v.level).toBe('warn');
    expect(v.canSubmit).toBe(true);
    expect(v.message).toContain('30');
  });

  it('超过硬性上限 200 字拒绝提交', () => {
    const v = validateTextInput('安'.repeat(TEXT_HARD_MAX + 1));
    expect(v.level).toBe('error');
    expect(v.canSubmit).toBe(false);
  });
});

describe('文字模式复用同一算法', () => {
  it('文字取数得到的三个数字直接进入九宫连续起宫算法', () => {
    const detail = textToNumbers('此心安处是吾乡');
    const result = createDivinationResult({
      mode: 'text',
      month: detail.numbers[0],
      day: detail.numbers[1],
      hour: detail.numbers[2],
    });
    const direct = calculateThreeSteps(detail.numbers[0], detail.numbers[1], detail.numbers[2]);
    expect(result.steps.map((s) => s.resultIndex)).toEqual(direct.steps.map((s) => s.resultIndex));
    expect(result.input.mode).toBe('text');
    expect(result.steps[0].inputNumber).toBe(detail.numbers[0]);
  });

  it('文字模式结果与生辰模式同一算法：相同数字必然相同落宫', () => {
    const textResult = textToNumbers('小吉空亡病符').numbers; // 6 字 → 1,?,?
    const a = calculateThreeSteps(textResult[0], textResult[1], textResult[2]);
    const b = calculateThreeSteps(textResult[0], textResult[1], textResult[2]);
    expect(a.steps.map((s) => PALACES[s.resultIndex])).toEqual(
      b.steps.map((s) => PALACES[s.resultIndex]),
    );
  });
});
