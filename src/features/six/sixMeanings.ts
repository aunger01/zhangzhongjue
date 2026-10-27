/**
 * 六宫释义配置与解读合成
 *
 * 释义与组件完全分离：这里只放文案与规则，不引用任何视图代码。
 * 文案取自《小六壬精华》（掌中诀网站开发/六宫小六壬.pdf）的断词、月日时取象、
 * 用神喜忌与五行取事，再用与九宫线一致的"象征性提示"笔法落成现代中文。
 *
 * ⚠️ 纪律：本模块只解释已算出的宫位，绝不重算、不改宫位；
 * 对健康 / 财务 / 法律等高风险事项不作确定性结论。
 */

import { getPalaceMeta, type PalaceName, type PalaceOmen } from '../divination/palaceConstants';
import { STEP_LABELS } from '../divination/types';
import type { StepReading, OverallTone } from '../interpretation/composeResult';
import { INTERPRETATION_DISCLAIMER, PRIVACY_NOTICE } from '../interpretation/palaceMeanings';
import {
  SIX_NUMBER_MEANINGS,
  SIX_ODD_NUMBERS,
  SIX_PALACE_META,
  SIX_STEP_SUBJECT,
  SIX_TOPICS,
  getSixPalaceMeta,
  type SixPalaceName,
} from './sixConstants';
import type { SixResult } from './sixCalculate';

/* ------------------------------------------------------------------ */
/* 单宫释义                                                             */
/* ------------------------------------------------------------------ */

export interface SixPalaceReading {
  /** 一句话象意（承 PDF「身不动时 / 卒未归时…」） */
  summary: string;
  /** 月位：父母、长辈、上级层面的处境 */
  asMonth: string;
  /** 日位：自身、亲属层面的处境 */
  asDay: string;
  /** 时位：子孙、晚辈、财物层面的处境 */
  asHour: string;
  advice: readonly string[];
  cautions: readonly string[];
}

export const SIX_PALACE_READINGS: Readonly<Record<SixPalaceName, SixPalaceReading>> = {
  大安: {
    summary: '身不动时，主安稳守成，事在旧处。',
    asMonth: '月起大安：起因安稳，多由长辈、上级或既有基础促成，不必另起炉灶。',
    asDay: '日临大安：自身处境平顺，宜按旧路推进，动不如静。',
    asHour: '时落大安：收束安稳，结局多以「守住」呈现，应期不急。',
    advice: ['按既定节奏推进，不必临时改弦更张。', '把力气放在已经握在手里的事上。'],
    cautions: ['过度求稳会错过窗口：稳不等于不动。'],
  },
  留连: {
    summary: '卒未归时，主迟滞未决，事难速成。',
    asMonth: '月起留连：起因带着犹豫，动念之初便不够干脆，或受他人牵延。',
    asDay: '日临留连：自身处境胶着，反复沟通、来回拉扯，进度慢于预期。',
    asHour: '时落留连：收束停在「还没定」，须主动设期限，否则久拖成局。',
    advice: ['给自己设一个明确期限，到期即做决断。', '先把最卡的那一环解决，其余自然松动。'],
    cautions: ['更须防口舌：话不宜说满，事不宜拖久。'],
  },
  速喜: {
    summary: '人即至时，主喜信速来，应期在近。',
    asMonth: '月起速喜：起因带消息与契机，多由外部信息触发。',
    asDay: '日临速喜：自身处境转快，答复与反馈比预期来得早。',
    asHour: '时落速喜：收束偏快，近期可见分晓，宜及时接住。',
    advice: ['对消息及时回应，别让机会在犹豫里流走。', '短期有成即收，不必贪多。'],
    cautions: ['速则不细：快的时候最容易漏掉细节。'],
  },
  赤口: {
    summary: '官事凶时，主口舌是非，争竞生嫌。',
    asMonth: '月起赤口：起因多涉言语、约定与规则之争，官非切要防。',
    asDay: '日临赤口：自身处于是非场中，沟通易生误会，宜留痕、宜书面。',
    asHour: '时落赤口：收束带争，结局易以口舌或契约摩擦呈现，慎言慎约。',
    advice: ['重要沟通留书面凭据，口头承诺补一句确认。', '争议先降级再处理，把情绪与事实分开。'],
    cautions: ['本页不作任何法律判断；涉诉或涉约请咨询专业人士。'],
  },
  小吉: {
    summary: '人来喜时，主和合小成，凡事可商量。',
    asMonth: '月起小吉：起因带和合之气，多由他人引荐或商量而起。',
    asDay: '日临小吉：自身处境和顺，交易与谈判都还有余地。',
    asHour: '时落小吉：收束小而实，格局不大却是可依的一步。',
    advice: ['把话摆上桌面谈，商量比强推更有效。', '小成之后稳住，不急着追加筹码。'],
    cautions: ['「吉」是相对的：小吉主小成，别按大成来安排。'],
  },
  空亡: {
    summary: '信音稀时，主谋事落空，求而无益。',
    asMonth: '月起空亡：起因本身带虚，信息不足或前提尚未落实。',
    asDay: '日临空亡：自身处境多耗，忙而无功，宜先辨真伪再投入。',
    asHour: '时落空亡：收束落空，求财无利、失物难寻，宜缓不宜强求。',
    advice: ['把关键动作放在「验证之后」，先小样试水。', '涉及资金与承诺的事，预留退路。'],
    cautions: ['空亡主虚：这一局不宜据此加码。'],
  },
};

/* ------------------------------------------------------------------ */
/* 五行生克（用神喜忌）                                                 */
/* ------------------------------------------------------------------ */

const GENERATES: Readonly<Record<string, string>> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

const CONTROLS: Readonly<Record<string, string>> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

export type SixElementRelation =
  | 'same'
  | 'self-generates'
  | 'self-controls'
  | 'other-generates'
  | 'other-controls';

/**
 * 用神（日宫，取"自身"）与时辰宫的五行关系。
 * 依 PDF「用神喜忌」：与吉神相冲克则吉事不吉；与凶神相冲克则凶中有吉；
 * 与吉神相生则吉上加吉；与凶神相生则雪上加霜。
 */
export function sixElementRelation(dayElement: string, hourElement: string): SixElementRelation {
  if (dayElement === hourElement) return 'same';
  if (GENERATES[dayElement] === hourElement) return 'self-generates';
  if (CONTROLS[dayElement] === hourElement) return 'self-controls';
  if (GENERATES[hourElement] === dayElement) return 'other-generates';
  return 'other-controls';
}

const RELATION_TEXT: Readonly<Record<SixElementRelation, string>> = {
  same: '日用神与时辰宫同气：事体一以贯之，取向一致，但容易一条道走到黑。',
  'self-generates': '日宫之气生时辰宫：自身投入在往外送，付出多而回收慢，宜量力。',
  'self-controls': '日宫之气克时辰宫：自身能压住局面，主动权在我，但用力过猛易伤和气。',
  'other-generates': '时辰宫之气生助日宫：外来得力，收束处有依靠，宜借势而不必独撑。',
  'other-controls': '时辰宫之气克日宫：外势压身，收束处受制，宜先卸力再谈推进。',
};

/** 月日时三宫五行同类所主（PDF 第 8~9 页原文） */
const SAME_ELEMENT_NOTES: Readonly<Record<string, string>> = {
  木: '月日时皆是木（木重）：主事有争端，或囚伏不动，克泄者有生。',
  火: '月日时皆是火（火旺）：主事有拖延，官司牵连，口舌是非，居住之处不吉。',
  金: '月日时皆是金（金沉）：主官司凶事，邪淫奸私，六亲刑克，家宅不安。',
  水: '月日时皆是水（水猛）：主漂流，虽吉无生，仁而无恩，桃花多，多情。',
  土: '月日时皆是土（土厚）：主办事迟滞不动，牢狱凶灾。',
};

/** 五行取事（PDF 第 9 页原文，供规则说明引用） */
export const SIX_ELEMENT_CASES: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: '木逢旺金有凶灾',
    text: '青龙木逢白虎旺金克之，主官司失利、外出不吉、求财不得、婚姻不成；木为肢体，亦主四肢筋骨之伤。',
  },
  {
    title: '旺金遇火有凶伤',
    text: '白虎旺金遇腾蛇火，主血光凶伤，或田地房产、合同不明、妇女隐私之事斗打官司。',
  },
  {
    title: '旺土挡水走不顺',
    text: '小吉水遇勾陈旺土，主外出不顺有阻隔；小吉为桃花，桃花受阻则婚姻不成，有小人说坏话。',
  },
  {
    title: '木入旺土是牢狱',
    text: '青龙木见勾陈旺土，主有牢狱之灾或凶灾；木见旺土，土埋木，棺材是木，是被土埋的，主死灾。',
  },
  {
    title: '水来克火有病灾',
    text: '小吉水去克朱雀火，朱雀乃火神不宜克，克者对自身不好，主心脑之疾、肾虚之病。',
  },
];

/** 看吉日（PDF 第 6 页） */
export const SIX_LUCKY_DAY_RULES: ReadonlyArray<string> = [
  '结婚、上梁的日子与时辰宜选大安、速喜。',
  '买卖开业的日子与时辰宜选速喜、小吉。',
  '出行的时辰宜选小吉、留连。',
  '动土、下葬的时辰宜选大安。',
  '看吉日起课：从大安起课，大安起月，月上起日，日上起时。',
];

/* ------------------------------------------------------------------ */
/* 解读合成                                                             */
/* ------------------------------------------------------------------ */

export interface SixInterpretationContext {
  /** 输入摘要，例如「农历三月初三 · 卯时」 */
  inputSummary: string;
  /** 起宫依据，例如「婚姻杂事（官喜宫·大安）」 */
  originLabel: string;
  /** 自报三数时的数字释义（可选） */
  numberNotes?: readonly string[];
}

export interface SixInterpretation {
  headline: string;
  overall: string;
  combination: string;
  steps: StepReading[];
  positives: string[];
  cautions: string[];
  advice: string[];
  keywords: string[];
  tone: OverallTone;
  /** 六宫特有：逐步断词（PDF 原诗） */
  verses: Array<{ step: string; stepLabel: string; palaceName: string; lines: readonly string[] }>;
  /** 六宫特有：用神生克提示 */
  relationNote: string;
  /** 六宫特有：三宫五行同类提示（未命中为空） */
  sameElementNote: string;
  /** 六宫特有：自报三数的数字释义 */
  numberNotes: string[];
  disclaimer: string;
  privacy: string;
  shareText: string;
}

const ROLE_BY_STEP = {
  month: '起因 / 父母长辈',
  day: '过程 / 自身处境',
  hour: '结果 / 子孙财物',
} as const;

function omenWord(omen: PalaceOmen): string {
  if (omen === 'auspicious') return '偏吉';
  if (omen === 'inauspicious') return '偏滞';
  return '中平';
}

/** 1~10 数字释义（仅对 1~10 生效，其余数字只标阴阳吉凶属性） */
export function sixNumberNote(value: number): string {
  const text = SIX_NUMBER_MEANINGS[value];
  const odd = (SIX_ODD_NUMBERS as readonly number[]).includes(value);
  const parity = odd ? '单数为阳' : '双数为阴';
  if (!text) return `${value}：${parity}，超出 1~10 释义范围，只取其阴阳属性。`;
  return `${value}：${parity}，${text}。`;
}

/** 生成六宫完整解读 */
export function sixComposeInterpretation(
  result: SixResult,
  context: SixInterpretationContext,
): SixInterpretation {
  const readings: StepReading[] = result.steps.map((step) => {
    const meta = getSixPalaceMeta(step.resultIndex);
    const startMeta = getSixPalaceMeta(step.startIndex);
    const meaning = SIX_PALACE_READINGS[meta.name];
    const positionalText =
      step.step === 'month'
        ? meaning.asMonth
        : step.step === 'day'
          ? meaning.asDay
          : meaning.asHour;
    // StepReading 复用九宫类型：六宫名均在九宫名集合内，故类型天然兼容
    const palaceName = meta.name as PalaceName;
    return {
      step: step.step,
      stepLabel: STEP_LABELS[step.step],
      role: ROLE_BY_STEP[step.step],
      inputNumber: step.inputNumber,
      startName: startMeta.name,
      palaceIndex: step.resultIndex,
      palaceName,
      order: meta.order,
      omen: meta.omen,
      positionalText,
      text: `${STEP_LABELS[step.step]}位 · 以${startMeta.name}起数 ${step.inputNumber} 次，落${meta.name}（第 ${meta.order} 位）：${meaning.summary}`,
      pathNames: step.pathIndices.map((i) => SIX_PALACE_META[i].name),
    } satisfies StepReading;
  });

  const monthMeta = getSixPalaceMeta(readings[0].palaceIndex);
  const dayMeta = getSixPalaceMeta(readings[1].palaceIndex);
  const hourMeta = getSixPalaceMeta(readings[2].palaceIndex);

  const omens = readings.map((reading) => reading.omen);
  const ausAuspicious = omens.filter((omen) => omen === 'auspicious').length;
  const inauspicious = omens.filter((omen) => omen === 'inauspicious').length;
  const tone: OverallTone =
    ausAuspicious >= 2 ? 'auspicious' : inauspicious >= 2 ? 'inauspicious' : 'mixed';

  const relation = sixElementRelation(dayMeta.element, hourMeta.element);
  const relationNote = `${RELATION_TEXT[relation]}（日宫${dayMeta.name}属${dayMeta.element}，时宫${hourMeta.name}属${hourMeta.element}）`;

  const sameElementNote =
    monthMeta.element === dayMeta.element && dayMeta.element === hourMeta.element
      ? (SAME_ELEMENT_NOTES[monthMeta.element] ?? '')
      : '';

  const overall = [
    `本局以${result.input.originName}起课（${context.originLabel}），`,
    `月位落${monthMeta.name}、日位落${dayMeta.name}、时位落${hourMeta.name}。`,
    `月看${SIX_STEP_SUBJECT.month}，日看${SIX_STEP_SUBJECT.day}，时看${SIX_STEP_SUBJECT.hour}。`,
    `月${omenWord(monthMeta.omen)}、日${omenWord(dayMeta.omen)}、时${omenWord(hourMeta.omen)}。`,
  ].join('');

  const combination = [
    sameElementNote,
    relationNote,
    ausAuspicious === 3
      ? '三宫皆吉：起因、自身与收束都在吉位，本局底色顺遂，更该留意别把顺遂当成必然。'
      : inauspicious === 3
        ? '三宫皆滞：起因、自身与收束都落在滞位，本局不宜强求，宜静守休整。'
        : `三宫吉位 ${ausAuspicious} 处、滞位 ${inauspicious} 处，走势取决于投入的节奏与分寸。`,
  ]
    .filter(Boolean)
    .join('');

  const positives: string[] = [];
  readings.forEach((reading) => {
    if (reading.omen === 'auspicious') {
      positives.push(`${reading.stepLabel}位${reading.palaceName}：${reading.positionalText}`);
    }
  });
  if (positives.length === 0) {
    positives.push('本局三宫未见明显吉位，但仍可把握的是「确定性」：能验证、能商量、能留痕的事，都属于可依托之处。');
  }

  const cautions: string[] = [];
  readings.forEach((reading) => {
    if (reading.omen === 'inauspicious') {
      const meaning = SIX_PALACE_READINGS[reading.palaceName as SixPalaceName];
      cautions.push(`${reading.stepLabel}位${reading.palaceName}：${reading.positionalText}${meaning.cautions[0] ?? ''}`);
    }
  });
  if (readings.some((reading) => reading.palaceName === '空亡')) {
    cautions.push('空亡之位提示预期可能落空：涉及资金与承诺的事项宜留出退路。');
  }
  if (readings.some((reading) => reading.palaceName === '赤口')) {
    cautions.push('赤口之位提示言语与约定的风险：重要沟通宜留痕、书面确认。');
  }
  if (cautions.length === 0) {
    cautions.push('吉位之中仍需留意节奏：顺遂时最容易松懈，把关键细节再核一遍更稳。');
  }

  const hourAdvice = SIX_PALACE_READINGS[hourMeta.name as SixPalaceName].advice;
  const dayAdvice = SIX_PALACE_READINGS[dayMeta.name as SixPalaceName].advice;
  const advice = Array.from(new Set([...hourAdvice, ...dayAdvice])).slice(0, 4);

  const keywords = Array.from(
    new Set(
      result.steps.flatMap((step) => getSixPalaceMeta(step.resultIndex).keywords as readonly string[]),
    ),
  ).slice(0, 6);

  const verses = readings.map((reading) => ({
    step: reading.step,
    stepLabel: reading.stepLabel,
    palaceName: reading.palaceName as string,
    lines: getSixPalaceMeta(reading.palaceIndex).verse,
  }));

  const numbersText = `${result.input.month}、${result.input.day}、${result.input.hour}`;
  const headline = `收束在${hourMeta.name} · ${tone === 'auspicious' ? '结局偏吉' : tone === 'inauspicious' ? '宜缓宜守' : '得失并存'}`;

  const shareText = [
    '掌中诀 · 六宫小六壬',
    `占测：${context.inputSummary}`,
    `起宫：${context.originLabel}`,
    `起数：${numbersText}`,
    `月宫 ${readings[0].palaceName} · 日宫 ${readings[1].palaceName} · 时宫 ${readings[2].palaceName}`,
    `整体：${headline}`,
    '',
    '【整体判断】',
    overall,
    combination,
    '',
    '【逐步解析】',
    ...readings.map((reading) => `· ${reading.role}：${reading.text}`),
    ...verses.map((verse) => `· ${verse.stepLabel}位${verse.palaceName}断词：${verse.lines.join('')}`),
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
    verses,
    relationNote,
    sameElementNote,
    numberNotes: [...(context.numberNotes ?? [])],
    disclaimer: INTERPRETATION_DISCLAIMER,
    privacy: PRIVACY_NOTICE,
    shareText,
  };
}

/** 事由清单（供表单与规则说明复用） */
export const SIX_TOPIC_LIST = SIX_TOPICS;

/** 九宫释义模块也导出这两段合规文案，这里重新导出便于六宫视图独立引用 */
export { INTERPRETATION_DISCLAIMER, PRIVACY_NOTICE };

/** 依据索引取宫位展示名（含别称提示），供卡片副标题使用 */
export function sixPalaceCaption(index: number): string {
  const meta = getSixPalaceMeta(index);
  return `${meta.name}（${meta.guardian}·${meta.element}·${meta.direction}）`;
}

/** 与九宫一致的宫位元数据取用（避免视图层直接依赖 divination 常量） */
export { getPalaceMeta };
