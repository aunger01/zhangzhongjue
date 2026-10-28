/**
 * 六宫小六壬 · 常量定义（依《小六壬精华》传统六宫法）
 *
 * 依据文件：掌中诀网站开发/六宫小六壬.pdf（9 页扫描件，内容为《小六壬精华》）。
 *
 * ⚠️ 与九宫的关系：
 *   - 六宫只有六个宫位，没有病符 / 桃花 / 天德；
 *   - 掐指顺序为 大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡 → 大安（模 6）；
 *   - 掌位与九宫布局不同（六宫取"根 / 尖"两节，见下表），故本文件自带一套掌位元数据。
 *
 * 本文件只描述"是什么"（名称、掌位、属性、断词），不含任何计算逻辑。
 */

import type { PalaceMeta, PalaceOmen } from '../divination/palaceConstants';

/** 六宫正式名称，数组下标即算法索引 */
export const SIX_PALACES = ['大安', '留连', '速喜', '赤口', '小吉', '空亡'] as const;

export type SixPalaceName = (typeof SIX_PALACES)[number];

/** 宫位总数：六宫 */
export const SIX_PALACE_COUNT = 6;

/** 通用问事的起宫（大安为正月） */
export const SIX_DEFAULT_ORIGIN_INDEX = 0;

/**
 * 六宫掌诀定位（PDF 第 1 页原文）：
 *   大安 → 食指根部 ｜ 留连 → 食指尖部 ｜ 速喜 → 中指尖部
 *   赤口 → 无名指尖部 ｜ 小吉 → 无名指根部 ｜ 空亡 → 中指根部
 *
 * 六宫只落在"根 / 尖"两节，中间一节不承载宫位——这是传统掌诀的位置，不是缺漏。
 */
export interface SixPalaceMeta extends PalaceMeta {
  name: SixPalaceName;
  /** 临神（六神）：青龙 / 六合 / 朱雀 / 白虎 / 勾陈 / 玄武 */
  guardian: string;
  /** 谋事日：该宫主事的日子尾数 */
  days: string;
  /** 断词四句（PDF 第 2 页原文，逐字照录） */
  verse: readonly string[];
  /** 关键词，用于结果页标签 */
  keywords: readonly string[];
  /** 六神象义（临神所主之事） */
  guardianNote: string;
}

export const SIX_PALACE_META: readonly SixPalaceMeta[] = [
  {
    index: 0,
    order: 1,
    id: 'daan',
    name: '大安',
    finger: 'index',
    segment: 'proximal',
    brief: '身不动：一切静止不动、平安',
    omen: 'auspicious',
    element: '木',
    direction: '东方',
    guardian: '青龙',
    guardianNote: '青龙表示吉祥',
    days: '一、四、七日',
    // 断词四句（转录底本第 2 页，逐字照录；标点按底本补齐，拼接后即成完整句）
    verse: [
      '大安事事昌，求财在坤方；',
      '失物去不远，宅舍保平安；',
      '行人身未动，病者身无妨；',
      '将军回田野，仔细更推详。',
    ],
    keywords: ['安稳', '守成', '不动', '旧处'],
  },
  {
    index: 1,
    order: 2,
    id: 'liulian',
    name: '留连',
    finger: 'index',
    segment: 'distal',
    brief: '卒未归：时机未到、凡事暂缓',
    omen: 'inauspicious',
    element: '水',
    direction: '北方',
    guardian: '玄武',
    guardianNote: '玄武表示盗贼',
    days: '二、五、八日',
    verse: [
      '留连事难成，求谋日未明；',
      '官事只宜缓，去者未回程；',
      '失物南方见，急讨方称心；',
      '更须防口舌，人口且平平。',
    ],
    keywords: ['迟滞', '未明', '拖延', '防口舌'],
  },
  {
    index: 2,
    order: 3,
    id: 'suxi',
    name: '速喜',
    finger: 'middle',
    segment: 'distal',
    brief: '人便至：时机已到、速办成功',
    omen: 'auspicious',
    element: '火',
    direction: '南方',
    guardian: '朱雀',
    guardianNote: '朱雀表示悦吉',
    days: '三、六、九日',
    verse: [
      '速喜喜来临，求财向南行；',
      '失物申未午，逢人路上寻；',
      '官事有福德，病者无祸侵；',
      '田宅六畜吉，行人有信音。',
    ],
    keywords: ['喜信', '速至', '应期近', '福德'],
  },
  {
    index: 3,
    order: 4,
    id: 'chikou',
    name: '赤口',
    finger: 'ring',
    segment: 'distal',
    brief: '官事凶：口舌是非、办事宜缓',
    omen: 'inauspicious',
    element: '金',
    direction: '西方',
    guardian: '白虎',
    guardianNote: '白虎表示凶险',
    days: '四、七、十日',
    verse: [
      '赤口主口舌，官非切要防；',
      '失物速速讨，行人有惊惶；',
      '鸡猴多做怪，病者出西方；',
      '更需防咒咀，诫恐染瘟殃。',
    ],
    keywords: ['口舌', '官非', '争竞', '慎言'],
  },
  {
    index: 4,
    order: 5,
    id: 'xiaoji',
    name: '小吉',
    finger: 'ring',
    segment: 'proximal',
    brief: '人来喜：喜事到来、成功在望',
    omen: 'auspicious',
    element: '木',
    direction: '东方',
    guardian: '六合',
    guardianNote: '六合表示和合',
    days: '一、四、七日',
    verse: [
      '小吉最吉昌，路上好商量；',
      '阴人来报喜，失物在坤方；',
      '行人即便至，交易甚是强；',
      '凡事皆和合，病者祈上苍。',
    ],
    keywords: ['和合', '小成', '商量', '人来'],
  },
  {
    index: 5,
    order: 6,
    id: 'kongwang',
    name: '空亡',
    finger: 'middle',
    segment: 'proximal',
    brief: '信音稀：查无音信、办事无成',
    omen: 'inauspicious',
    element: '土',
    direction: '中央',
    guardian: '勾陈',
    guardianNote: '勾陈表示官讼',
    days: '三、六、九日',
    verse: [
      '空亡事不祥，阴人少乖张；',
      '求财无利益，行人有灾殃；',
      '失物寻不见，官事有刑伤；',
      '病人逢暗鬼，祈解保安康。',
    ],
    keywords: ['落空', '信稀', '虚耗', '宜缓'],
  },
];

/** 依据算法索引取六宫元数据 */
export function getSixPalaceMeta(index: number): SixPalaceMeta {
  if (!Number.isInteger(index) || index < 0 || index >= SIX_PALACE_COUNT) {
    throw new Error(`六宫索引必须为 0 至 ${SIX_PALACE_COUNT - 1} 的整数，收到：${index}`);
  }
  return SIX_PALACE_META[index];
}

/** 宫位名 → 算法索引（供事类起宫查表） */
export function sixPalaceIndex(name: SixPalaceName): number {
  const index = SIX_PALACES.indexOf(name);
  if (index < 0) throw new Error(`六宫表中不存在宫位：${name}`);
  return index;
}

/** 六宫循环顺序文本，用于规则说明 */
export const SIX_PALACE_CYCLE_TEXT = `${SIX_PALACES.join(' → ')} → 大安……`;

/* ------------------------------------------------------------------ */
/* 起宫依据：事类起课（起课歌诀）                                        */
/* ------------------------------------------------------------------ */

export type SixTopicId = 'general' | 'marriage' | 'wealth' | 'illness' | 'lawsuit' | 'travel';

export interface SixTopic {
  id: SixTopicId;
  /** 事由名称 */
  label: string;
  /** 起宫宫位 */
  origin: SixPalaceName;
  /** 该宫在此事由下的别称（如"官喜宫"） */
  palaceLabel: string;
  /** 歌诀原文 */
  verse: string;
  /** 一句话说明 */
  note: string;
}

/**
 * 起课歌诀（PDF 第 4 页原文）：
 *   婚姻杂事去官府，位置在大安；
 *   求财经商找财爷，位置在留连；
 *   疾厄病苦到寿宫，位置在速喜；
 *   官司诉讼在监察，位置在赤口；
 *   外出旅行有驿站，位置在小吉；
 *   死亡宫里有神灵，位置在空亡。
 *
 * ⚠️ 空亡不起课（PDF 第 5 页注："空亡不起课，因为空亡是空，无实际东西存在，所以不以空亡起课。"），
 *    故空亡只作为落宫出现，不作为起宫选项。
 */
export const SIX_TOPICS: readonly SixTopic[] = [
  {
    id: 'general',
    label: '通用问事',
    origin: '大安',
    palaceLabel: '官喜宫',
    verse: '以大安作为正月，月上起日，日上起时',
    note: '不指定事由时，依通用问事之法：大安为正月，月上起日、日上起时。',
  },
  {
    id: 'marriage',
    label: '婚姻杂事',
    origin: '大安',
    palaceLabel: '官喜宫',
    verse: '婚姻杂事去官府，位置在大安',
    note: '问婚姻杂事从官喜宫起课，官喜宫落在大安。',
  },
  {
    id: 'wealth',
    label: '求财经商',
    origin: '留连',
    palaceLabel: '财帛宫',
    verse: '求财经商找财爷，位置在留连',
    note: '问求财从财帛宫起课，财帛宫落在留连。',
  },
  {
    id: 'illness',
    label: '疾厄病苦',
    origin: '速喜',
    palaceLabel: '寿宫',
    verse: '疾厄病苦到寿宫，位置在速喜',
    note: '问疾病从福寿宫起课，福寿宫落在速喜（歌诀称寿宫）。',
  },
  {
    id: 'lawsuit',
    label: '官司诉讼',
    origin: '赤口',
    palaceLabel: '监察宫',
    verse: '官司诉讼在监察，位置在赤口',
    note: '问官司从监察宫起课，监察宫落在赤口。',
  },
  {
    id: 'travel',
    label: '外出旅行',
    origin: '小吉',
    palaceLabel: '驿马宫',
    verse: '外出旅行有驿站，位置在小吉',
    note: '问出行从驿马宫起课，驿马宫落在小吉。',
  },
];

export function getSixTopic(id: SixTopicId): SixTopic {
  const topic = SIX_TOPICS.find((item) => item.id === id);
  if (!topic) throw new Error(`未知事由：${String(id)}`);
  return topic;
}

/* ------------------------------------------------------------------ */
/* 断课歌诀：分事由 × 分宫（转录底本第 6~7 页「歌诀」）                   */
/* ------------------------------------------------------------------ */

/** 有断课歌诀的五个事由（通用问事与占人无歌诀，用断词断课） */
export type SixVerseTopicId = 'marriage' | 'wealth' | 'illness' | 'lawsuit' | 'travel';

/**
 * 断课歌诀：问某事落某宫的原文断语（转录底本第 6~7 页，逐字照录）。
 * 例如「财占速喜九分财，若要得全贵人帮」——问求财落速喜即引此句。
 */
export const SIX_TOPIC_VERSES: Readonly<
  Record<SixVerseTopicId, Readonly<Record<SixPalaceName, string>>>
> = {
  marriage: {
    大安: '婚占大安婚自安，青梅竹马结良缘',
    留连: '婚占留连有犹豫，男女两家都不欢',
    速喜: '婚占速喜喜喜喜，一见钟情成一家',
    赤口: '婚占赤口婚不吉，棒打鸳鸯各一方',
    小吉: '婚占小吉桃花婚，男的潇洒女风光',
    空亡: '婚占空亡喜无音，单身男女泪汪汪',
  },
  wealth: {
    大安: '财占大安不动财，动则钱财有损伤',
    留连: '财占留连为无财，真想求财去远方',
    速喜: '财占速喜九分财，若要得全贵人帮',
    赤口: '财占赤口一口财，辛辛苦苦才能赚到',
    小吉: '财占小吉流动财，即有去的也有来',
    空亡: '财占空亡意外财，要逢天时好运帮',
  },
  illness: {
    大安: '病占大安不用慌，上天佑你保健康',
    留连: '病占留连多忧愁，缠绵缠缠病不离',
    速喜: '病占速喜病来急，急速医治别务期',
    赤口: '病占赤口是重衰，忍受痛苦度病关',
    小吉: '病占小吉为吉利，不用慌忙病有安',
    空亡: '病占空亡为无病，有病可能是癔病',
  },
  lawsuit: {
    大安: '官司大安是不顺，要找贵人来疏通',
    留连: '官司留连有拖延，耐心等待不要忙',
    速喜: '官司速喜有明理，是黑是白自分明',
    赤口: '官司赤口是不顺，官司输定必不疑',
    小吉: '官司小吉要答礼，舍财保身得平安',
    空亡: '官司空亡无灾难，虚惊一场不要慌',
  },
  travel: {
    大安: '大安外出不宜远，不求财来可以走',
    留连: '留连外出是远行，忧心忡忡有拖延',
    速喜: '速喜外出走的慌，匆匆忙忙来观光',
    赤口: '赤口外出有凶险，按兵不动是真招',
    小吉: '小吉外出最顺当，一路观光一路戏',
    空亡: '空亡外出最不欢，有失无中不乐观',
  },
};

/** 歌诀事由的题头名（转录底本用「婚占 / 财占 / 病占 / 官司 / 外出」） */
export const SIX_VERSE_TOPIC_LABELS: Readonly<Record<SixVerseTopicId, string>> = {
  marriage: '婚占',
  wealth: '财占',
  illness: '病占',
  lawsuit: '官司',
  travel: '外出',
};

/** 依事由与落宫取断课歌诀；无歌诀的事由返回 null */
export function getSixTopicVerse(topicId: SixTopicId | null, palaceName: SixPalaceName): string | null {
  if (!topicId || !(topicId in SIX_TOPIC_VERSES)) return null;
  return SIX_TOPIC_VERSES[topicId as SixVerseTopicId][palaceName];
}

/** 占人起课：女起重阴、男起重阳（PDF 第 5 页） */
export const SIX_PERSON_ORIGIN = {
  female: { origin: '留连', note: '女起重阴：六神中留连是重阴，故女起留连。' },
  male: { origin: '小吉', note: '男起重阳：六神中小吉是重阳，故男起小吉。' },
} as const satisfies Record<'female' | 'male', { origin: SixPalaceName; note: string }>;

export type SixPersonGender = keyof typeof SIX_PERSON_ORIGIN;

/* ------------------------------------------------------------------ */
/* 占人取用神：四季五行（PDF 第 8 页「占人取用神」）                      */
/* ------------------------------------------------------------------ */

/**
 * 四季五行（底本第 8 页原文：占人以四季为用神，如春季生人以木为用神，
 * 夏季生人以火为用神，秋季生人以金为用神，冬季生人以水为用神）。
 * 月界按农历正～三月为春、四～六月为夏、七～九月为秋、十～十二月为冬。
 */
export const SIX_SEASONS = [
  { name: '春', element: '木', monthFrom: 1, monthTo: 3 },
  { name: '夏', element: '火', monthFrom: 4, monthTo: 6 },
  { name: '秋', element: '金', monthFrom: 7, monthTo: 9 },
  { name: '冬', element: '水', monthFrom: 10, monthTo: 12 },
] as const;

export type SixSeason = (typeof SIX_SEASONS)[number];

/** 依农历月份取季节（占人起课以生月定生季，进而定用神五行） */
export function getSixSeasonByMonth(month: number): SixSeason {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`农历月份必须为 1 至 12 的整数，收到：${String(month)}`);
  }
  return SIX_SEASONS.find(
    (season) => month >= season.monthFrom && month <= season.monthTo,
  ) as SixSeason;
}

/* ------------------------------------------------------------------ */
/* 变通取数：单双阴阳与 1~10 吉凶数（PDF 第 3 页）                       */
/* ------------------------------------------------------------------ */

/** 单数（阳数） */
export const SIX_ODD_NUMBERS = [1, 3, 5, 7, 9] as const;
/** 双数（阴数） */
export const SIX_EVEN_NUMBERS = [2, 4, 6, 8, 10] as const;
/** 吉数 */
export const SIX_LUCKY_NUMBERS = [1, 3, 5, 6, 7, 8] as const;
/** 凶数 */
export const SIX_UNLUCKY_NUMBERS = [2, 4, 9, 10] as const;

/** 1~10 数字释义（PDF 第 3 页原文） */
export const SIX_NUMBER_MEANINGS: Readonly<Record<number, string>> = {
  1: '吉，健全，万物之始富贵之大吉之数',
  2: '凶，破败，内外困境、波澜之遭难数',
  3: '吉，吉祥，阴阳和合福禄之首领数',
  4: '凶，凶变，多劫、辛苦、夭折之困难数',
  5: '吉，禄寿，健全、圆通、富贵之福德数',
  6: '吉，安稳，祥德、福庆、富豪之天德数',
  7: '吉，精悍，独立、刚毅、尊严之权威数',
  8: '吉，坚刚，进取、名实两得之成功数',
  9: '凶，凶恶，坎坷、短命逆运之破败数',
  10: '凶，暗暗，空虚、遭难、黑暗之终运数',
};

/** 六神象义（PDF 第 3 页） */
export const SIX_GUARDIAN_MEANINGS: Readonly<Record<string, string>> = {
  青龙: '表示吉祥',
  六合: '表示和合',
  朱雀: '表示悦吉',
  白虎: '表示凶险',
  勾陈: '表示官讼',
  玄武: '表示盗贼',
};

/* ------------------------------------------------------------------ */
/* 月、日、时三级取象（PDF 第 7 页）                                     */
/* ------------------------------------------------------------------ */

export const SIX_STEP_SUBJECT = {
  month: '父母、长辈、上级、领导、官员',
  day: '自身、妻妾、亲属、家内',
  hour: '子孙、晚辈、下级、奴仆、物品、六畜、财产、方位',
} as const;

/** 吉凶基调的中文名 */
export const SIX_OMEN_LABELS: Readonly<Record<PalaceOmen, string>> = {
  auspicious: '偏吉',
  mixed: '中平',
  inauspicious: '偏滞',
};

/* ------------------------------------------------------------------ */
/* 算法标识                                                             */
/* ------------------------------------------------------------------ */

/**
 * 算法标识与版本：演算开始后固定，写入结果对象。
 *
 * 版本沿革：
 * - 1.0.0：传统六宫法首版——六宫循环（模 6）、事类起宫、占人起宫、
 *          农历月日时与自报三数两种取数入口。
 */
export const SIX_ALGORITHM_ID = 'liugong-xiaoliuren';
export const SIX_ALGORITHM_VERSION = '1.0.0';
export const SIX_ALGORITHM_NAME = '六宫小六壬 · 传统起课法';
