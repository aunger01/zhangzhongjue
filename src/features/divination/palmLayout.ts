/**
 * 掌位图视觉坐标配置（与算法顺序严格分离）
 *
 * ⚠️ 纪律：本文件只描述"画在哪里"。
 * 修改这里的任何数值都不会、也不允许改变算法结果——
 * 算法索引与掌位坐标之间只通过 palaceConstants 的 finger / segment 字段关联。
 *
 * 布局：掌心朝向用户，指尖朝上；食指在左、中指居中、无名指在右。
 * 从指尖朝手掌方向：远节最靠指尖，近节最靠手掌。
 */

import { FINGER_LABELS, PALACE_META, type FingerId, type SegmentId } from './palaceConstants';

/**
 * SVG 画布尺寸（viewBox）。
 * minY 取负值，给"指尖指示器"预留上方空间，避免窄屏裁切。
 */
export const PALM_VIEWBOX = { minX: 0, minY: -20, width: 420, height: 640 } as const;

/** 指节区下沿：手指与手掌的分界 y 坐标 */
export const FINGER_BOTTOM = 306;

/** 手掌主体上沿 */
export const PALM_TOP = 290;

/** 手掌主体下沿 / 手腕起点 */
export const PALM_BOTTOM = 470;

/** 手腕底部 */
export const WRIST_BOTTOM = 582;

/** 手指布局 id：三根正式手指 + 装饰性小指 */
export type FingerLayoutId = FingerId | 'pinky';

export interface FingerLayout {
  id: FingerLayoutId;
  /** 手指中轴 x */
  cx: number;
  /** 指尖 y */
  top: number;
  /** 手指宽度 */
  width: number;
  /** 装饰指（不承载宫位，仅用于手掌形态完整性） */
  decorative?: boolean;
}

/**
 * 三指布局：与需求文档 2.1「三指布局对照」一致。
 * 另加小指与拇指作为装饰，保证掌形完整（不参与任何计算与高亮）。
 */
export const FINGERS: readonly FingerLayout[] = [
  { id: 'index', cx: 120, top: 62, width: 68 },
  { id: 'middle', cx: 210, top: 38, width: 70 },
  { id: 'ring', cx: 298, top: 56, width: 68 },
  { id: 'pinky', cx: 372, top: 122, width: 52, decorative: true },
];

/** 指节顺序：从指尖到手掌 */
export const SEGMENT_ORDER: readonly SegmentId[] = ['distal', 'middle', 'proximal'] as const;

export interface CellLayout {
  /** 宫位算法索引（0 起），即单元格按算法索引寻址 */
  index: number;
  palaceId: string;
  finger: FingerId;
  segment: SegmentId;
  /** 单元格矩形 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 中心点（指示器定位基准） */
  cx: number;
  cy: number;
}

const CELL_INSET = 5;

function buildCellLayout(): CellLayout[] {
  const cells: CellLayout[] = new Array(PALACE_META.length);

  PALACE_META.forEach((palace) => {
    const finger = FINGERS.find((f) => f.id === palace.finger);
    if (!finger) {
      throw new Error(`掌位配置缺少手指：${palace.finger}`);
    }
    const segmentIdx = SEGMENT_ORDER.indexOf(palace.segment);
    if (segmentIdx < 0) {
      throw new Error(`掌位配置缺少指节：${palace.segment}`);
    }
    const totalLength = FINGER_BOTTOM - finger.top;
    const unit = totalLength / SEGMENT_ORDER.length;

    const width = finger.width - CELL_INSET * 2;
    const height = unit - CELL_INSET * 2;
    const x = finger.cx - width / 2;
    const y = finger.top + unit * segmentIdx + CELL_INSET;

    cells[palace.index] = {
      index: palace.index,
      palaceId: palace.id,
      finger: palace.finger,
      segment: palace.segment,
      x,
      y,
      width,
      height,
      cx: x + width / 2,
      cy: y + height / 2,
    };
  });

  return cells;
}

/**
 * 九宫单元格布局，按算法索引寻址：CELL_LAYOUT[算法索引]。
 * 这是掌位图与算法之间唯一的几何桥梁。
 */
export const CELL_LAYOUT: readonly CellLayout[] = buildCellLayout();

/** 依据算法索引取单元格 */
export function cellFor(index: number): CellLayout {
  const cell = CELL_LAYOUT[index];
  if (!cell) {
    throw new Error(`掌位图缺少宫位单元格：索引 ${index}`);
  }
  return cell;
}

/** 生成手指外形路径（顶部半圆胶囊） */
export function fingerPath(finger: FingerLayout): string {
  const r = finger.width / 2;
  const x0 = finger.cx - r;
  const x1 = finger.cx + r;
  const topY = finger.top + r;
  const bottomY = FINGER_BOTTOM + 6;
  return [
    `M ${x0} ${bottomY}`,
    `L ${x0} ${topY}`,
    `A ${r} ${r} 0 0 1 ${x1} ${topY}`,
    `L ${x1} ${bottomY}`,
    'Z',
  ].join(' ');
}

/** 手掌主体路径（掌心朝向用户） */
export const PALM_BODY_PATH = [
  `M 62 ${PALM_TOP + 16}`,
  `C 62 ${PALM_TOP + 4} 74 ${PALM_TOP} 90 ${PALM_TOP}`,
  `L 396 ${PALM_TOP}`,
  `C 406 ${PALM_TOP} 410 ${PALM_TOP + 8} 410 ${PALM_TOP + 18}`,
  `L 410 ${PALM_BOTTOM - 40}`,
  `C 410 ${PALM_BOTTOM + 6} 384 ${PALM_BOTTOM + 30} 344 ${PALM_BOTTOM + 44}`,
  `L 320 ${PALM_BOTTOM + 54}`,
  `L 320 ${WRIST_BOTTOM - 20}`,
  `C 320 ${WRIST_BOTTOM - 6} 310 ${WRIST_BOTTOM} 296 ${WRIST_BOTTOM}`,
  `L 176 ${WRIST_BOTTOM}`,
  `C 162 ${WRIST_BOTTOM} 152 ${WRIST_BOTTOM - 6} 152 ${WRIST_BOTTOM - 20}`,
  `L 152 ${PALM_BOTTOM + 54}`,
  `L 128 ${PALM_BOTTOM + 44}`,
  `C 88 ${PALM_BOTTOM + 30} 62 ${PALM_BOTTOM + 6} 62 ${PALM_BOTTOM - 40}`,
  'Z',
].join(' ');

/** 拇指（装饰）：从掌侧斜向左下 */
export const THUMB_PATH = [
  'M 96 322',
  'C 66 326 30 350 12 388',
  'C 2 410 6 434 26 442',
  'C 46 450 62 436 70 414',
  'L 96 356',
  'Z',
].join(' ');

/** 掌纹装饰线（纯装饰，无交互） */
export const PALM_CREASES: readonly string[] = [
  'M 92 372 C 150 340 250 336 392 356',
  'M 92 428 C 160 402 268 404 396 424',
  'M 140 340 C 176 380 190 448 178 512',
  'M 300 344 C 286 392 288 452 304 510',
];

/** 指节分隔线（视觉辅助，非交互） */
export function knuckleLines(): Array<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  finger: FingerLayoutId;
}> {
  const lines: Array<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    finger: FingerLayoutId;
  }> = [];
  FINGERS.filter((f) => !f.decorative).forEach((finger) => {
    const totalLength = FINGER_BOTTOM - finger.top;
    const unit = totalLength / SEGMENT_ORDER.length;
    for (let i = 1; i < SEGMENT_ORDER.length; i += 1) {
      const y = finger.top + unit * i;
      lines.push({
        x1: finger.cx - finger.width / 2 + 2,
        y1: y,
        x2: finger.cx + finger.width / 2 - 2,
        y2: y,
        finger: finger.id,
      });
    }
  });
  return lines;
}

/** 手指名称标注位置 */
export function fingerLabelAnchor(finger: FingerLayout): { x: number; y: number; label: string } {
  const label =
    finger.id === 'pinky' ? '小指' : FINGER_LABELS[finger.id as FingerId];
  return {
    x: finger.cx,
    y: finger.top - 16,
    label,
  };
}
