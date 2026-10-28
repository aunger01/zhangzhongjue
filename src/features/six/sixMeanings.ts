/**
 * 六宫释义配置与解读合成
 *
 * 唯一底本：《小六壬精华》逐字转录（掌中诀网站开发/六宫小六壬_PDF原文转录.md）。
 * 所有断词、一句话象义、月日时取象、用神喜忌、五行取事、断课歌诀均引底本原文，
 * 不复用九宫（divination / interpretation）的任何释义内容。
 *
 * ⚠️ 纪律：本模块只解释已算出的宫位，绝不重算、不改宫位；
 * 对健康 / 财务 / 法律等高风险事项不作确定性结论，免责声明全页只出现一次。
 */

import { STEP_LABELS } from '../divination/types';
import type { StepReading, OverallTone } from '../interpretation/composeResult';
import {
  SIX_GUARDIAN_MEANINGS,
  SIX_NUMBER_MEANINGS,
  SIX_PALACE_META,
  SIX_PALACES,
  SIX_STEP_SUBJECT,
  getSixPalaceMeta,
  getSixTopic,
  getSixTopicVerse,
  type SixPalaceName,
  type SixTopicId,
} from './sixConstants';
import type { SixResult } from './sixCalculate';

/* ------------------------------------------------------------------ */
/* 六宫专属合规文案（不用九宫版；免责全页只出现一次）                     */
/* ------------------------------------------------------------------ */

export const SIX_INTERPRETATION_DISCLAIMER =
  '本页解读基于传统六宫小六壬（《小六壬精华》断词与歌诀）整理生成，属于传统文化体验与自我省思工具，不具备科学预测能力，也不构成医疗、投资、法律或其他专业建议。涉及健康、财务、法律等重要事项，请以专业人士意见为准。';

export const SIX_PRIVACY_NOTICE =
  '你填写的农历月日时或自报三数只在当前浏览器内存中参与计算：不上传、不保存、不要求注册，也不使用任何第三方分析或广告脚本。历史记录（若启用）仅保存在本机浏览器，可随时一键清空。';

/* ------------------------------------------------------------------ */
/* 单宫释义（断词与一句话象义均引底本原文）                               */
/* ------------------------------------------------------------------ */

export interface SixPalaceReading {
  /** 一句话象义（底本第 3 页：身不动 / 卒未归 / 人便至 / 官事凶 / 人来喜 / 信音稀） */
  summary: string;
  /** 月位（父母、长辈、上级、领导、官员）落此宫的断语，引断词原句 */
  asMonth: string;
  /** 日位（自身、妻妾、亲属、家内）落此宫的断语 */
  asDay: string;
  /** 时位（子孙、晚辈、下级、物品、六畜、财产、方位）落此宫的断语 */
  asHour: string;
  advice: readonly string[];
  cautions: readonly string[];
}

export const SIX_PALACE_READINGS: Readonly<Record<SixPalaceName, SixPalaceReading>> = {
  大安: {
    summary: '身不动：失物、行人等一切静止不动，主平安。',
    asMonth: '月起大安：「宅舍保平安」——起因安稳，父母长辈与上级处可依托。',
    asDay: '日临大安：「行人身未动」——自身宜静守，按原路推进，动不如静。',
    asHour: '时落大安：「求财在坤方，失物去不远」——收束安稳，所求所失皆在近处。',
    advice: ['大安主静：宜守成，按既定节奏推进。', '所寻之物「去不远」：先从近处、宅舍找起。'],
    cautions: ['大安主不动，过静则滞：该推动之处仍须推动。'],
  },
  留连: {
    summary: '卒未归：时机未到，凡事暂缓，失物未远。',
    asMonth: '月起留连：「求谋日未明」——起因便带迟滞，前提未落实，宜先备齐条件。',
    asDay: '日临留连：「去者未回程」——自身胶着，凡事暂缓，进度慢于预期。',
    asHour: '时落留连：「失物南方见」——收束未定，久拖之事宜主动设期。',
    advice: ['留连主缓：「官事只宜缓」，急也无用。', '给自己定个期限，到期即做决断。'],
    cautions: ['留连「更须防口舌」：话不说满，事不拖久。'],
  },
  速喜: {
    summary: '人便至：时机已到，刻不容缓，速办成功。',
    asMonth: '月起速喜：「喜来临」——起因带消息与契机，应期在近。',
    asDay: '日临速喜：「求财向南行」——自身转快，宜把握时机、速办速决。',
    asHour: '时落速喜：「田宅六畜吉」——收束向好，近期可见分晓。',
    advice: ['速喜主快：时机已到，刻不容缓。', '短期有成即收，不必贪多。'],
    cautions: ['速则易漏：越快越要核好细节。'],
  },
  赤口: {
    summary: '官事凶：口舌是非，主事不利，办事宜缓。',
    asMonth: '月起赤口：「官非切要防」——起因多涉言语与规矩之争。',
    asDay: '日临赤口：「行人有惊惶」——自身处于是非之中，沟通易生误会。',
    asHour: '时落赤口：「失物速速讨」——收束带争，宜及早处理，慎言慎约。',
    advice: ['赤口主争：「办事宜缓」，先降温再处理。', '重要约定落成文字，口头承诺补一句确认。'],
    cautions: ['赤口主口舌：少说多听，把情绪与事实分开。'],
  },
  小吉: {
    summary: '人来喜：喜事到来，办事吉利，成功在望。',
    asMonth: '月起小吉：「路上好商量」——起因带和合之气，有人引荐帮忙。',
    asDay: '日临小吉：「交易甚是强」——自身和顺，谈判交易有余地。',
    asHour: '时落小吉：「凡事皆和合」——收束小而实，可以落定。',
    advice: ['小吉主和：把话摆上桌面，商量成事。', '「交易甚是强」：谈得成，小成即安。'],
    cautions: ['小吉主小成：别按大成来安排后手。'],
  },
  空亡: {
    summary: '信音稀：查无音信，难有结果，办事无成。',
    asMonth: '月起空亡：「阴人少乖张」——起因本身带虚，信息不足。',
    asDay: '日临空亡：「求财无利益」——自身多耗，忙而无功。',
    asHour: '时落空亡：「失物寻不见」——收束落空，宜缓不宜强求。',
    advice: ['空亡主空：先辨真伪，再谈投入。', '涉及资金与承诺，预留退路。'],
    cautions: ['空亡主落空：此局不宜据此加码。'],
  },
};

/* ------------------------------------------------------------------ */
/* 用神（底本第 7~8 页：占事取用神 / 用神喜忌）                           */
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

/** 两宫五行的生克关系（供用神喜忌判定） */
export function sixElementRelation(dayElement: string, hourElement: string): SixElementRelation {
  if (dayElement === hourElement) return 'same';
  if (GENERATES[dayElement] === hourElement) return 'self-generates';
  if (CONTROLS[dayElement] === hourElement) return 'self-controls';
  if (GENERATES[hourElement] === dayElement) return 'other-generates';
  return 'other-controls';
}

/** 吉神与凶神（底本第 8 页「用神喜忌」以吉神 / 凶神论生克） */
const AUSPICIOUS_PALACES: ReadonlySet<string> = new Set(['大安', '速喜', '小吉']);

export interface SixYongshen {
  /** 用神宫名 */
  palaceName: SixPalaceName;
  palaceIndex: number;
  /** 取用神的依据（底本原文） */
  basis: string;
  /** 用神喜忌断语（逐条对应课内其余宫位） */
  notes: string[];
}

/**
 * 取用神（底本第 7 页「占事取用神」）：
 *   占婚姻以大安为用神、求财以留连、疾病以速喜、官司以赤口、出行以小吉；
 *   通用问事与占人起课无指定宫位，以日宫（自身）为用神。
 */
export function sixResolveYongshenIndex(topicId: SixTopicId | null, dayIndex: number): number {
  if (topicId && topicId !== 'general') {
    return sixPalaceIndexOf(getSixTopic(topicId).origin);
  }
  return dayIndex;
}

function sixPalaceIndexOf(name: SixPalaceName): number {
  return SIX_PALACES.indexOf(name);
}

/** 按底本「用神喜忌」生成断语：与吉神 / 凶神相冲克、相生的四种组合，外加逢空亡 */
function buildYongshenNotes(
  yongshenIndex: number,
  stepMetas: ReadonlyArray<{ step: 'month' | 'day' | 'hour'; index: number }>,
): string[] {
  const yongshen = getSixPalaceMeta(yongshenIndex);
  const notes: string[] = [];

  if (yongshen.name === '空亡') {
    notes.push('课内用神逢空亡：主事情虚假，吉凶变动不定，寻人望事有变。');
  }

  for (const { step, index } of stepMetas) {
    if (index === yongshenIndex) continue;
    const other = getSixPalaceMeta(index);
    const relation = sixElementRelation(yongshen.element, other.element);
    const otherIsAuspicious = AUSPICIOUS_PALACES.has(other.name);
    const otherKind = otherIsAuspicious ? `吉神${other.name}` : `凶神${other.name}`;
    const stepLabel = STEP_LABELS[step];

    if (relation === 'self-controls' || relation === 'other-controls') {
      notes.push(
        `用神${yongshen.name}（${yongshen.element}）与${stepLabel}位${otherKind}（${other.element}）相冲克：${
          otherIsAuspicious ? '主吉事不吉，办事无成，喜事成空。' : '主凶事不凶，凶中有吉，化险为夷。'
        }`,
      );
    } else if (relation === 'self-generates' || relation === 'other-generates') {
      notes.push(
        `用神${yongshen.name}（${yongshen.element}）与${stepLabel}位${otherKind}（${other.element}）相生：${
          otherIsAuspicious ? '主吉事更吉，喜上加喜。' : '主凶事更凶，雪上加霜。'
        }`,
      );
    } else {
      notes.push(
        `用神${yongshen.name}与${stepLabel}位${other.name}五行同气（${other.element}）：取向一致，事体一贯。`,
      );
    }
  }

  return notes;
}

/* ------------------------------------------------------------------ */
/* 五行同类所主与五行取事（底本第 8~9 页原文）                            */
/* ------------------------------------------------------------------ */

/** 月日时三宫五行同类所主（底本第 8 页原文） */
const SAME_ELEMENT_NOTES: Readonly<Record<string, string>> = {
  木: '月、日、时与用神都是木或木重：主事有争端，或囚伏不动，克泄者有生。',
  火: '月、日、时都是火或火旺：主事有拖延，官司牵连，口舌是非，居住之处不吉。',
  金: '月、日、时都是金或金沉：主官司凶事，邪淫奸私，六亲刑克，家宅不安。',
  水: '月、日、时都是水或水猛：主漂流，虽吉无生，仁而无恩，桃花多，多情。',
  土: '月、日、时都是土或土厚：主办事迟滞不动，牢狱凶灾。',
};

/** 五行取事（底本第 9 页原文，供规则说明引用） */
export const SIX_ELEMENT_CASES: ReadonlyArray<{ title: string; text: string }> = [
  {
    title: '木逢旺金有凶灾',
    text: '青龙木逢白虎旺金克为青龙死，主官司失利，外出不吉，求财不得，婚姻不成，办事不成；木为肢体遭旺金克，损四肢伤筋骨，主有肝病、风瘫病、眼目之疾。',
  },
  {
    title: '旺金遇火有凶伤',
    text: '白虎旺金遇腾蛇火有血光凶伤，腾蛇为田土主暗昧不明事，或因田地房产、合同不明、妇女隐私之事斗打官司。',
  },
  {
    title: '旺土挡水走不顺',
    text: '小吉水遇勾陈旺土主外出不顺有阻隔；小吉为桃花，桃花受阻婚姻不成，有小人说坏话、拆婚。',
  },
  {
    title: '木入旺土是牢狱',
    text: '青龙木见勾陈旺土主有牢狱之灾或凶灾；木见旺土，土埋木，棺材是木，是被土埋的，表示死灾。',
  },
  {
    title: '水来克火有病灾',
    text: '小吉水去克朱雀火神主有病：朱雀乃火神不宜克，克者对自身不好；火为心和头部，水克火主心脑疾病，水主肾，水去克火肾虚，也主肾病，还主妇女病。',
  },
];

/** 看吉日（底本第 6 页） */
export const SIX_LUCKY_DAY_RULES: ReadonlyArray<string> = [
  '结婚、上梁的日子和时辰应选在大安和速喜为吉利。',
  '买卖开业的日子和时辰应选在速喜和小吉为吉利。',
  '出行的时辰应在小吉和留连为吉利。',
  '动土、下葬的时辰应在大安为吉利。',
  '看吉日起课：看日子从大安开始起课，大安起月，月上起日，日上起时辰。',
];

/* ------------------------------------------------------------------ */
/* 解读合成                                                             */
/* ------------------------------------------------------------------ */

export interface SixInterpretationContext {
  /** 输入摘要，例如「农历三月初三 · 卯时」 */
  inputSummary: string;
  /** 起宫依据，例如「婚姻杂事（官喜宫·大安）」 */
  originLabel: string;
  /** 起宫依据的事由 id（general / 占人传 null，无歌诀） */
  topicId?: SixTopicId | null;
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
  /** 六宫特有：逐步断词（底本原诗，含标点） */
  verses: Array<{ step: string; stepLabel: string; palaceName: string; lines: readonly string[] }>;
  /** 六宫特有：断课歌诀（仅五个事由有；通用问事与占人为空） */
  topicVerses: Array<{ step: string; stepLabel: string; palaceName: string; verse: string }>;
  /** 六宫特有：用神取法与喜忌断语 */
  yongshen: SixYongshen;
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

function omenWord(omen: 'auspicious' | 'mixed' | 'inauspicious'): string {
  if (omen === 'auspicious') return '偏吉';
  if (omen === 'inauspicious') return '偏滞';
  return '中平';
}

/** 1~10 数字释义（仅对 1~10 生效，其余数字只标阴阳吉凶属性） */
export function sixNumberNote(value: number): string {
  const text = SIX_NUMBER_MEANINGS[value];
  // 阴阳按奇偶性判定（底本以 1~10 定义单阳双阴，对更大的自报数按奇偶自然推广；
  // 归约公式 ((n−1) mod 12)+1 的模为偶数，raw 与归约后奇偶一致）
  const odd = value % 2 === 1;
  const parity = odd ? '单数为阳' : '双数为阴';
  if (!text) return `${value}：${parity}，超出 1~10 释义范围，只取其阴阳属性。`;
  return `${value}：${parity}，${text}。`;
}

/** 生成六宫完整解读 */
export function sixComposeInterpretation(
  result: SixResult,
  context: SixInterpretationContext,
): SixInterpretation {
  const topicId = context.topicId ?? null;

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
    const palaceName = meta.name;
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
      text: `${STEP_LABELS[step.step]}位（${ROLE_BY_STEP[step.step]}）落${meta.name}——${meaning.summary}`,
      pathNames: step.pathIndices.map((i) => SIX_PALACE_META[i].name),
    } satisfies StepReading;
  });

  const monthMeta = getSixPalaceMeta(readings[0].palaceIndex);
  const dayMeta = getSixPalaceMeta(readings[1].palaceIndex);
  const hourMeta = getSixPalaceMeta(readings[2].palaceIndex);

  const omens = readings.map((reading) => reading.omen);
  const auspiciousCount = omens.filter((omen) => omen === 'auspicious').length;
  const inauspiciousCount = omens.filter((omen) => omen === 'inauspicious').length;
  const tone: OverallTone =
    auspiciousCount >= 2 ? 'auspicious' : inauspiciousCount >= 2 ? 'inauspicious' : 'mixed';

  // 用神（底本：占事以宫位取用神；通用 / 占人以日宫为用神）
  const yongshenIndex = sixResolveYongshenIndex(topicId, dayMeta.index);
  const yongshenMeta = getSixPalaceMeta(yongshenIndex);
  const yongshenBasis =
    topicId && topicId !== 'general'
      ? `占${getSixTopic(topicId).label}，以宫位取用神：${getSixTopic(topicId).origin}为用神。`
      : '通用问事 / 占人起课无指定宫位，以日宫（自身）为用神。';
  const yongshen: SixYongshen = {
    palaceName: yongshenMeta.name,
    palaceIndex: yongshenIndex,
    basis: yongshenBasis,
    notes: buildYongshenNotes(yongshenIndex, [
      { step: 'month', index: monthMeta.index },
      { step: 'day', index: dayMeta.index },
      { step: 'hour', index: hourMeta.index },
    ]),
  };

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
    auspiciousCount === 3
      ? '三宫皆吉：起因、自身与收束都在吉位，本局底色顺遂，更该留意别把顺遂当成必然。'
      : inauspiciousCount === 3
        ? '三宫皆滞：起因、自身与收束都落在滞位，本局不宜强求，宜静守休整。'
        : `三宫吉位 ${auspiciousCount} 处、滞位 ${inauspiciousCount} 处，走势取决于投入的节奏与分寸。`,
  ]
    .filter(Boolean)
    .join('');

  const positives: string[] = [];
  readings.forEach((reading) => {
    if (reading.omen === 'auspicious') {
      positives.push(`${reading.stepLabel}位${reading.palaceName}：${SIX_PALACE_READINGS[reading.palaceName as SixPalaceName].summary}`);
    }
  });
  if (positives.length === 0) {
    positives.push('本局三宫未见明显吉位，但仍可把握的是「确定性」：能验证、能商量、能留痕的事，都属于可依托之处。');
  }

  const cautions: string[] = [];
  readings.forEach((reading) => {
    if (reading.omen === 'inauspicious') {
      const meaning = SIX_PALACE_READINGS[reading.palaceName as SixPalaceName];
      cautions.push(`${reading.stepLabel}位${reading.palaceName}：${meaning.cautions[0] ?? ''}`);
    }
  });
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

  // 断课歌诀：五个事由才有（底本第 6~7 页）；通用问事与占人为空
  const topicVerses: SixInterpretation['topicVerses'] = [];
  readings.forEach((reading) => {
    const verse = getSixTopicVerse(topicId, reading.palaceName as SixPalaceName);
    if (verse) {
      topicVerses.push({
        step: reading.step,
        stepLabel: reading.stepLabel,
        palaceName: reading.palaceName,
        verse,
      });
    }
  });

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
    ...(topicVerses.length > 0
      ? [
          '',
          '【断课歌诀】',
          ...topicVerses.map((verse) => `· ${verse.stepLabel}位${verse.palaceName}：${verse.verse}`),
        ]
      : []),
    '',
    '【用神喜忌】',
    `· ${yongshen.basis}`,
    ...yongshen.notes.map((note) => `· ${note}`),
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
    topicVerses,
    yongshen,
    sameElementNote,
    numberNotes: [...(context.numberNotes ?? [])],
    disclaimer: SIX_INTERPRETATION_DISCLAIMER,
    privacy: SIX_PRIVACY_NOTICE,
    shareText,
  };
}

/** 事由清单（供表单与规则说明复用） */
export { SIX_TOPICS as SIX_TOPIC_LIST } from './sixConstants';

/** 六神象义快捷取用（底本第 3 页） */
export function sixGuardianNote(guardian: string): string {
  return SIX_GUARDIAN_MEANINGS[guardian] ?? '';
}
