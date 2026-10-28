/**
 * 九宫常量定义
 *
 * ⚠️ 本项目采用"九宫"顺序，病符 / 桃花 / 天德均为正式宫位，不是附加神煞。
 * 算法索引从 0 开始，顺序即真实掐指在掌上的循环顺序。
 */

/** 九宫正式名称，数组下标即算法索引 */
export const PALACES = [
  '大安',
  '留连',
  '速喜',
  '赤口',
  '小吉',
  '空亡',
  '病符',
  '桃花',
  '天德',
] as const;

export type PalaceName = (typeof PALACES)[number];

/** 宫位总数：九宫 */
export const PALACE_COUNT = 9;

/** 起宫永远从大安（索引 0）开始 */
export const ORIGIN_INDEX = 0;

export type FingerId = 'index' | 'middle' | 'ring';

export type SegmentId = 'distal' | 'middle' | 'proximal';

/** 手指中文名 */
export const FINGER_LABELS: Record<FingerId, string> = {
  index: '食指',
  middle: '中指',
  ring: '无名指',
};

/**
 * 指节中文名。
 * 从指尖朝手掌方向理解：远节最靠近指尖，近节最靠近手掌。
 */
export const SEGMENT_LABELS: Record<SegmentId, string> = {
  distal: '远节指骨',
  middle: '中节指骨',
  proximal: '近节指骨',
};

/** 宫位的吉凶基调，用于配色与综合解读，不参与算法 */
export type PalaceOmen = 'auspicious' | 'mixed' | 'inauspicious';

export interface PalaceMeta {
  /** 算法索引（0 起） */
  index: number;
  /** 对外序号（1 起） */
  order: number;
  /** 稳定 id（不随顺序/布局变化） */
  id: string;
  name: PalaceName;
  finger: FingerId;
  segment: SegmentId;
  /** 一句话象意（卡片与提示使用） */
  brief: string;
  omen: PalaceOmen;
  /** 五行属性（文化象征，仅用于展示） */
  element: string;
  /** 传统方位（文化象征，仅用于展示） */
  direction: string;
}

/**
 * 九宫正式对照表（与需求文档 2. 正式九宫定义与掌位布局 完全一致）。
 *
 * | 序号 | 宫位 | 手指   | 指节     | 索引 |
 * | 1    | 大安 | 食指   | 中节指骨 | 0    |
 * | 2    | 留连 | 食指   | 远节指骨 | 1    |
 * | 3    | 速喜 | 中指   | 远节指骨 | 2    |
 * | 4    | 赤口 | 无名指 | 中节指骨 | 3    |
 * | 5    | 小吉 | 中指   | 近节指骨 | 4    |
 * | 6    | 空亡 | 中指   | 中节指骨 | 5    |
 * | 7    | 病符 | 无名指 | 远节指骨 | 6    |
 * | 8    | 桃花 | 食指   | 近节指骨 | 7    |
 * | 9    | 天德 | 无名指 | 近节指骨 | 8    |
 */
export const PALACE_META: readonly PalaceMeta[] = [
  {
    index: 0,
    order: 1,
    id: 'daan',
    name: '大安',
    finger: 'index',
    segment: 'middle',
    brief: '安稳守成，事在旧处',
    omen: 'auspicious',
    element: '木',
    direction: '东方',
  },
  {
    index: 1,
    order: 2,
    id: 'liulian',
    name: '留连',
    finger: 'index',
    segment: 'distal',
    brief: '迟疑滞留，久拖未决',
    omen: 'inauspicious',
    element: '水',
    direction: '北方',
  },
  {
    index: 2,
    order: 3,
    id: 'suxi',
    name: '速喜',
    finger: 'middle',
    segment: 'distal',
    brief: '喜信速至，应期在近',
    omen: 'auspicious',
    element: '火',
    direction: '南方',
  },
  {
    index: 3,
    order: 4,
    id: 'chikou',
    name: '赤口',
    finger: 'ring',
    segment: 'middle',
    brief: '口舌是非，争竞生嫌',
    omen: 'inauspicious',
    element: '金',
    direction: '西方',
  },
  {
    index: 4,
    order: 5,
    id: 'xiaoji',
    name: '小吉',
    finger: 'middle',
    segment: 'proximal',
    brief: '小得平安，和合可成',
    omen: 'auspicious',
    element: '木',
    direction: '东南',
  },
  {
    index: 5,
    order: 6,
    id: 'kongwang',
    name: '空亡',
    finger: 'middle',
    segment: 'middle',
    brief: '落空无着，谋事多虚',
    omen: 'inauspicious',
    element: '土',
    direction: '中央',
  },
  {
    index: 6,
    order: 7,
    id: 'bingfu',
    name: '病符',
    finger: 'ring',
    segment: 'distal',
    brief: '疾厄牵缠，宜静养慎行',
    omen: 'inauspicious',
    element: '土',
    direction: '西南',
  },
  {
    index: 7,
    order: 8,
    id: 'taohua',
    name: '桃花',
    finger: 'index',
    segment: 'proximal',
    brief: '情缘牵动，人际繁盛',
    omen: 'mixed',
    element: '水',
    direction: '北方',
  },
  {
    index: 8,
    order: 9,
    id: 'tiande',
    name: '天德',
    finger: 'ring',
    segment: 'proximal',
    brief: '贵人扶持，逢凶有解',
    omen: 'auspicious',
    element: '金',
    direction: '西北',
  },
];

/** 依据算法索引取宫位元数据 */
export function getPalaceMeta(index: number): PalaceMeta {
  if (!Number.isInteger(index) || index < 0 || index >= PALACE_COUNT) {
    throw new Error(`宫位索引必须为 0 至 ${PALACE_COUNT - 1} 的整数，收到：${index}`);
  }
  return PALACE_META[index];
}

/** 九宫循环顺序文本，用于规则说明 */
export const PALACE_CYCLE_TEXT = `${PALACES.join(' → ')} → 大安……`;

/**
 * 算法标识与版本：演算开始后固定，写入结果对象
 *
 * 版本沿革（九宫顺序、起宫规则、落宫公式全程未变，仅取数入口扩展）：
 * - 1.0.0：生辰起卦（公历/农历→三数）、心念数字起卦
 * - 1.1.0：新增文字（汉字笔画）起数——1~3 字取笔画，超过三字由用户自行删减；
 *          落宫仍走同一套 `(start + count − 1) mod 9`，故历史记录可跨版本对读
 * - 2.0.1：版本号统一（与六宫一并升为 2.0.1），算法本身无变化
 */
export const ALGORITHM_ID = 'jiugong-xiaoliuren';
export const ALGORITHM_VERSION = '2.0.1';
export const ALGORITHM_NAME = '九宫小六壬 · 连续起宫法';
