/**
 * 组合解读生成
 *
 * 输入：算法层已冻结的 DivinationResult。
 * 输出：整体判断、逐步解析、积极因素、需要留意、行动建议、组合解读与分享文本。
 *
 * ⚠️ 本模块只"解释"已算出的宫位，绝不重新计算、修改宫位，
 * 也不对健康 / 财务 / 法律等事项给出确定性结论。
 */

import {
  PALACES,
  getPalaceMeta,
  type PalaceName,
  type PalaceOmen,
} from '../divination/palaceConstants';
import { STEP_LABELS, type DivinationResult, type StepName } from '../divination/types';
import {
  INTERPRETATION_DISCLAIMER,
  PRIVACY_NOTICE,
  getPalaceMeaning,
} from './palaceMeanings';

export interface StepReading {
  step: StepName;
  stepLabel: string;
  /** 该步在整体中的角色：起因 / 过程 / 结果 */
  role: string;
  inputNumber: number;
  startName: string;
  palaceIndex: number;
  palaceName: PalaceName;
  order: number;
  omen: PalaceOmen;
  /** 该宫在此位的象征说明 */
  positionalText: string;
  /** 完整一句话 */
  text: string;
  pathNames: string[];
}

export type OverallTone = 'auspicious' | 'mixed' | 'inauspicious';

export interface ComposedInterpretation {
  headline: string;
  overall: string;
  combination: string;
  steps: StepReading[];
  positives: string[];
  cautions: string[];
  advice: string[];
  keywords: string[];
  tone: OverallTone;
  disclaimer: string;
  privacy: string;
  shareText: string;
}

export interface InterpretationContext {
  mode: 'birth' | 'text';
  /** 输入摘要，例如 "农历五月二十日，丑时" 或 "心念文字（12 字）" */
  inputSummary: string;
  /** 起数文本，例如 "5、20、2" */
  numbersText: string;
  /** 文字模式下的取数说明（可选） */
  methodNote?: string;
}

const ROLE_BY_STEP: Record<StepName, string> = {
  month: '起因 / 外部条件',
  day: '过程 / 当下处境',
  hour: '结果 / 应期',
};

function positionalTextOf(name: PalaceName, step: StepName): string {
  const meaning = getPalaceMeaning(name);
  if (step === 'month') return meaning.asMonth;
  if (step === 'day') return meaning.asDay;
  return meaning.asHour;
}

function omenWord(omen: PalaceOmen): string {
  if (omen === 'auspicious') return '偏吉';
  if (omen === 'inauspicious') return '偏滞';
  return '得失并存';
}

/** 主规则：描述"收束宫位"的整体格局，自上而下取第一条命中 */
interface ComboParams {
  monthName: string;
  dayName: string;
  hourName: string;
  omens: PalaceOmen[];
  ausAuspicious: number;
  inauspicious: number;
}

const PRIMARY_RULES: Array<{ test: (params: ComboParams) => boolean; text: string }> = [
  {
    test: ({ ausAuspicious }) => ausAuspicious === 3,
    text: '三宫皆吉：起因、过程与收束都在吉位，本局顺遂的底色明显。此时更值得留意的是"别把顺遂当成必然"，把该做的功课做扎实，顺势而为即是上策。',
  },
  {
    test: ({ inauspicious }) => inauspicious === 3,
    text: '三宫皆滞：起因、过程与收束都落在滞位，本局不宜强求。宜静不宜动、宜守不宜攻，把这段时间用来整理与休整，比勉强推进更划算。',
  },
  {
    test: ({ hourName }) => hourName === '天德',
    text: '收在时位为天德，主贵人扶持、逢凶有解：眼下的难处多能因外援与善意而松动，主动开口求助是关键的一步。',
  },
  {
    test: ({ hourName }) => hourName === '速喜',
    text: '收在时位为速喜，主喜信速至：应期在近，宜及时接住眼前的机会，别让它在犹豫中流走。',
  },
  {
    test: ({ hourName }) => hourName === '小吉',
    text: '收在时位为小吉，主和合小成：格局不大，却是扎实可依的一步。小成之后稳住，比追加筹码更重要。',
  },
  {
    test: ({ hourName }) => hourName === '大安',
    text: '收在时位为大安，主安稳守成：守住已经握在手里的，比另起炉灶更有利。',
  },
  {
    test: ({ hourName }) => hourName === '留连',
    text: '收在时位为留连，主迟滞未决：宜主动设定期限，避免久拖成局。',
  },
  {
    test: ({ hourName }) => hourName === '空亡',
    text: '收在时位为空亡，主事多落空：此时最宜缓一步，先验证再投入，不必急于要一个结果。把期望值调实，反而少些消耗。',
  },
  {
    test: ({ hourName }) => hourName === '病符',
    text: '收在时位为病符，主耗损牵缠：宜减量、宜静养，先把根本照顾妥当，再谈推进。',
  },
  {
    test: ({ hourName }) => hourName === '赤口',
    text: '收在时位为赤口，主口舌是非：慎言、慎约、慎签，能避掉大半麻烦。',
  },
  {
    test: ({ hourName }) => hourName === '桃花',
    text: '收在时位为桃花，主情缘牵动：人际与情感之事活跃，得失全在分寸二字。',
  },
];

/** 修正句：描述跨步骤的附加结构，可与主规则叠加，信息更完整 */
const MODIFIER_RULES: Array<{ test: (params: ComboParams) => boolean; text: string }> = [
  {
    test: ({ dayName, hourName }) => dayName === '空亡' && hourName !== '空亡',
    text: '另需留意日宫空亡：过程之中容易白忙一场或中途生变，但收束并不落在空处——把关键动作放在"验证之后"，先辨真伪再定去留。',
  },
  {
    test: ({ monthName, hourName }) =>
      monthName === '大安' && hourName !== '大安' && hourName !== '空亡',
    text: '月起大安而收于他宫：底子是稳的，变化发生在过程与结局。你有条件按自己的节奏走，但别指望事情一成不变。',
  },
];

function buildCombination(params: ComboParams): string {
  const primary = PRIMARY_RULES.find((rule) => rule.test(params));
  const modifier = MODIFIER_RULES.find((rule) => rule.test(params));

  const fallback =
    params.ausAuspicious >= 2
      ? `三宫之中吉位有 ${params.ausAuspicious} 处、滞位 ${params.inauspicious} 处，整体底色偏顺，宜趁着有利条件把该定的事定下来。`
      : params.inauspicious >= 2
        ? `三宫之中滞位有 ${params.inauspicious} 处、吉位 ${params.ausAuspicious} 处，整体偏于收敛，宜减少动作、把力气用在最要紧的一处。`
        : `三宫吉滞相当，本局走势平稳，成事与否更多取决于投入的节奏与分寸。`;

  return [primary?.text ?? fallback, modifier?.text ?? ''].filter(Boolean).join('');
}

function buildHeadline(hourName: string, tone: OverallTone): string {
  if (tone === 'auspicious') return `收束在${hourName} · 结局偏吉`;
  if (tone === 'inauspicious') return `收束在${hourName} · 宜缓宜守`;
  return `收束在${hourName} · 得失并存`;
}

function buildAdvice(readings: StepReading[]): string[] {
  const hour = readings[2];
  const day = readings[1];
  const candidates: string[] = [];

  candidates.push(...getPalaceMeaning(hour.palaceName).advice.slice(0, 2));
  candidates.push(...getPalaceMeaning(day.palaceName).advice.slice(0, 1));

  const inauspiciousSteps = readings.filter((r) => r.omen === 'inauspicious');
  if (inauspiciousSteps.length >= 2) {
    candidates.push('这阵子把目标收敛到一件事上，其余的排到后面，效果会更好。');
  } else if (inauspiciousSteps.length === 0) {
    candidates.push('顺境里给自己留一点余地：预留时间与预算，别把日程排满。');
  } else {
    candidates.push('把最不确定的那一环先做个小样试试，用最低成本换取确定信息。');
  }

  // 去重并限制在 2-4 条
  const unique = Array.from(new Set(candidates));
  return unique.slice(0, 4);
}

/** 生成完整解读 */
export function composeInterpretation(
  result: DivinationResult,
  context: InterpretationContext,
): ComposedInterpretation {
  const readings: StepReading[] = result.steps.map((step) => {
    const meta = getPalaceMeta(step.resultIndex);
    const startName = PALACES[step.startIndex];
    const meaning = getPalaceMeaning(meta.name);
    return {
      step: step.step,
      stepLabel: STEP_LABELS[step.step],
      role: ROLE_BY_STEP[step.step],
      inputNumber: step.inputNumber,
      startName,
      palaceIndex: step.resultIndex,
      palaceName: meta.name,
      order: meta.order,
      omen: meta.omen,
      positionalText: positionalTextOf(meta.name, step.step),
      text: `${STEP_LABELS[step.step]}宫 · 以${startName}起数 ${step.inputNumber} 次，落${meta.name}（第 ${meta.order} 位）：${meaning.summary}`,
      pathNames: step.pathIndices.map((i) => PALACES[i]),
    } as StepReading;
  });

  const omens = readings.map((r) => r.omen);
  const hour = readings[2];
  const ausAuspicious = omens.filter((o) => o === 'auspicious').length;
  const inauspicious = omens.filter((o) => o === 'inauspicious').length;

  const tone: OverallTone =
    ausAuspicious >= 2 ? 'auspicious' : inauspicious >= 2 ? 'inauspicious' : 'mixed';

  const monthName = readings[0].palaceName;
  const dayName = readings[1].palaceName;
  const hourName = hour.palaceName;

  const overall = [
    `本局以${monthName}起于月位，${dayName}行于日位，${hourName}收于时位。`,
    `起因${omenWord(readings[0].omen)}，过程${omenWord(readings[1].omen)}，收束${omenWord(readings[2].omen)}。`,
    `按象征体系，${hour.positionalText}`,
  ].join('');

  const combination = buildCombination({
    monthName,
    dayName,
    hourName,
    omens,
    ausAuspicious,
    inauspicious,
  });

  const positives: string[] = [];
  readings.forEach((r) => {
    if (r.omen === 'auspicious') {
      positives.push(`${r.stepLabel}宫${r.palaceName}：${r.positionalText}这是本局可依托之处。`);
    } else if (r.omen === 'mixed') {
      positives.push(`${r.stepLabel}宫${r.palaceName}：${r.positionalText}机会与消耗并存，取用全在分寸。`);
    }
  });
  if (positives.length === 0) {
    positives.push('本局三宫未见明显吉位，但仍可把握的是"确定性"：凡是能验证、能商量、能留痕的事，都属于可依托的部分。');
  }

  const cautions: string[] = [];
  readings.forEach((r) => {
    if (r.omen === 'inauspicious') {
      cautions.push(`${r.stepLabel}宫${r.palaceName}：${r.positionalText}`);
    }
  });
  if (readings.some((r) => r.palaceName === '病符')) {
    cautions.push('病符之位提示身体与精力的信号值得认真对待：如有不适请及时就医，本页不作任何医疗判断。');
  }
  if (readings.some((r) => r.palaceName === '赤口')) {
    cautions.push('赤口之位提示言语与约定的风险，重要沟通宜留痕、书面确认。');
  }
  if (readings.some((r) => r.palaceName === '空亡')) {
    cautions.push('空亡之位提示预期可能落空，涉及资金与承诺的事项宜留出退路。');
  }
  if (cautions.length === 0) {
    cautions.push('吉位之中仍需留意节奏：顺遂时最容易松懈，把关键细节再核一遍更稳。');
  }

  const keywords = Array.from(
    new Set(readings.flatMap((r) => getPalaceMeaning(r.palaceName).keywords)),
  ).slice(0, 6);

  const advice = buildAdvice(readings);
  const headline = buildHeadline(hourName, tone);

  /*
   * 分享 / 复制文本：与结果页展示的内容一一对应，不做删减。
   * 顺序：占测信息 → 三宫 → 整体判断 → 逐步解析 → 积极因素 → 需要留意 → 行动建议 → 免责。
   */
  const shareText = [
    '掌中诀 · 九宫小六壬',
    `占测：${context.inputSummary}`,
    `起数：${context.numbersText}`,
    `月宫 ${readings[0].palaceName} · 日宫 ${readings[1].palaceName} · 时宫 ${readings[2].palaceName}`,
    `整体：${headline}`,
    '',
    '【整体判断】',
    overall,
    combination,
    '',
    '【逐步解析】',
    ...readings.map((reading) => `· ${reading.role}：${reading.text}`),
    '',
    '【积极因素】',
    ...positives.map((item) => `· ${item}`),
    '',
    '【需要留意】',
    ...cautions.map((item) => `· ${item}`),
    '',
    '【行动建议】',
    ...advice.map((item, index) => `${index + 1}. ${item}`),
    '',
    '——仅供传统文化体验与自我省思，不构成任何专业建议。',
  ].join('\n');

  return {
    headline,
    overall,
    combination,
    steps: readings,
    positives,
    cautions,
    advice,
    keywords,
    tone,
    disclaimer: INTERPRETATION_DISCLAIMER,
    privacy: PRIVACY_NOTICE,
    shareText,
  };
}
