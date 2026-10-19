/**
 * 掌位图视觉坐标配置（与算法顺序严格分离）
 *
 * ⚠️ 纪律：本文件只描述"画在哪里"。
 * 修改这里的任何数值都不会、也不允许改变算法结果——
 * 算法索引与掌位坐标之间只通过 palaceConstants 的 finger / segment 字段关联。
 *
 * 手形来源：圣上提供的《九宫小六壬神掌》参考图矢量化——
 * 阈值分割 → 最大连通域 → Moore 边界追踪 → RDP 抽稀 → Catmull-Rom 平滑，
 * 轮廓与参考图逐像素吻合。手指几何由蒙版扫描线实测。
 *
 * 布局：掌心朝向用户，指尖朝上；食指在左、中指居中、无名指在右、
 * 小指在最右（装饰指，不承载宫位）、拇指从掌左侧斜向下伸出。
 * 从指尖朝手掌方向：远节最靠指尖，近节最靠手掌。
 *
 * 分层契约（PalmDiagram 渲染顺序，各层独立 SVG 分组）：
 *   1. outline-group  手掌轮廓（剪影填充 + 描边，底部渐隐）
 *   2. decor-group    装饰线条（云纹 / 指节线，同样随底部渐隐）
 *   3. palace-cells   九宫文字与宫牌（PalaceCell，可交互）
 */

import { PALACE_META, type FingerId, type SegmentId } from './palaceConstants';

/**
 * SVG 画布尺寸（viewBox）。
 * minY 取负值，给中指指尖上方留出呼吸空间，避免贴边裁切。
 */
export const PALM_VIEWBOX = { minX: 0, minY: -24, width: 420, height: 664 } as const;

/** 整手轮廓 path（参考图矢量化产物，闭合剪影） */
export const HAND_PATH = 'M 221.9 0.5 C 221.9 0.5 220.3 0.5 221.9 0.5 C 223.5 0.5 227.6 -0.8 231.6 0.5 C 235.6 1.8 242.4 5.5 245.8 8.4 C 249.2 11.3 250.2 13.6 252.0 18.2 C 253.8 22.8 255.1 25.0 256.4 35.9 C 257.7 46.8 259.3 70.3 259.9 83.7 C 260.5 97.1 259.0 99.7 259.9 116.4 C 260.8 133.1 264.5 166.0 265.2 183.7 C 265.9 201.4 264.1 204.6 264.3 222.6 C 264.5 240.6 265.5 278.8 266.1 291.6 C 266.7 304.4 267.6 298.3 267.9 299.6 C 268.2 300.9 266.9 310.5 267.9 299.6 C 268.9 288.7 272.6 267.6 274.1 234.1 C 275.6 200.6 275.5 126.0 276.7 98.7 C 277.9 71.4 279.3 77.5 281.2 70.4 C 283.1 63.3 285.8 59.6 288.2 56.2 C 290.6 52.8 292.6 51.6 295.3 50.0 C 298.0 48.4 300.8 46.9 304.2 46.5 C 307.6 46.1 311.9 45.9 315.7 47.4 C 319.5 48.9 324.0 51.0 327.2 55.3 C 330.4 59.6 333.2 63.9 335.1 73.0 C 337.0 82.2 338.1 96.8 338.7 110.2 C 339.3 123.6 337.7 127.3 338.7 153.6 C 339.7 179.8 343.9 239.8 344.9 267.7 C 345.9 295.6 344.6 311.5 344.9 320.8 C 345.2 330.1 346.4 323.1 346.7 323.5 C 347.0 323.9 346.3 324.5 346.7 323.5 C 347.1 322.5 348.4 321.3 349.3 317.3 C 350.2 313.3 351.3 307.9 352.0 299.6 C 352.7 291.3 352.8 276.2 353.7 267.7 C 354.6 259.1 356.1 266.4 357.3 248.3 C 358.5 230.2 359.5 177.4 360.8 158.9 C 362.1 140.4 363.0 143.2 365.2 137.6 C 367.4 132.0 371.6 127.8 374.1 125.3 C 376.6 122.8 377.8 122.9 380.3 122.6 C 382.8 122.3 385.9 121.7 389.1 123.5 C 392.4 125.3 397.0 127.6 399.8 133.2 C 402.6 138.8 404.1 135.8 405.9 157.1 C 407.7 178.3 409.8 231.2 410.4 260.7 C 411.0 290.2 410.4 312.9 409.5 334.1 C 408.6 355.3 407.5 368.8 405.1 388.1 C 402.7 407.4 398.6 434.2 395.3 450.1 C 392.1 466.0 389.4 473.4 385.6 483.7 C 381.8 494.0 376.9 503.8 372.3 512.0 C 367.7 520.2 362.9 527.0 358.2 533.2 C 353.5 539.4 347.6 543.7 344.0 549.2 C 340.4 554.7 338.7 559.2 336.9 566.0 C 335.1 572.8 334.0 580.3 333.4 589.9 C 332.8 599.5 334.4 616.6 333.4 623.5 C 332.4 630.4 331.2 629.1 327.2 631.5 C 323.2 633.9 316.0 636.4 309.5 637.7 C 303.0 639.0 306.3 639.2 288.2 639.4 C 270.1 639.5 218.1 639.3 200.6 638.6 C 183.1 637.9 187.6 636.6 182.9 635.0 C 178.2 633.4 174.7 631.1 172.3 628.8 C 170.0 626.4 169.4 628.3 168.8 620.9 C 168.2 613.5 170.4 594.6 168.8 584.6 C 167.2 574.6 166.2 569.9 159.0 560.7 C 151.8 551.6 137.9 543.6 125.4 529.7 C 112.9 515.8 91.8 488.4 83.8 477.5 C 75.8 466.6 80.7 473.1 77.6 464.2 C 74.5 455.3 71.2 438.3 65.2 424.4 C 59.2 410.5 46.6 393.7 41.3 381.0 C 36.0 368.3 38.7 360.4 33.4 348.3 C 28.1 336.2 13.0 316.5 9.5 308.4 C 6.0 300.3 10.8 301.8 12.1 299.6 C 13.4 297.4 15.2 296.4 17.4 295.2 C 19.6 294.0 20.7 292.6 25.4 292.5 C 30.1 292.4 39.9 292.7 45.8 294.3 C 51.7 295.9 56.7 299.5 60.8 302.3 C 64.9 305.1 67.1 307.3 70.5 311.1 C 73.9 314.9 78.0 320.3 81.1 325.3 C 84.2 330.3 86.6 334.7 89.1 341.2 C 91.6 347.7 93.7 358.6 96.2 364.2 C 98.7 369.8 102.1 372.3 104.2 374.8 C 106.3 377.3 107.6 378.6 108.6 379.2 C 109.6 379.8 109.8 388.0 110.4 378.4 C 111.0 368.8 112.1 349.1 112.1 321.7 C 112.1 294.3 110.1 251.6 110.4 213.8 C 110.7 176.1 112.9 118.5 113.9 95.2 C 114.9 71.9 115.3 79.8 116.5 73.9 C 117.7 68.0 118.6 64.1 121.0 59.8 C 123.4 55.5 127.2 51.0 130.7 48.3 C 134.2 45.6 139.1 44.5 142.2 43.8 C 145.3 43.0 146.4 43.0 149.3 43.8 C 152.2 44.5 156.7 45.8 159.9 48.3 C 163.2 50.8 166.6 54.9 168.8 58.9 C 171.0 62.9 171.9 64.8 173.2 72.2 C 174.5 79.6 176.0 90.1 176.7 103.1 C 177.4 116.1 176.8 136.6 177.6 150.0 C 178.3 163.4 179.7 161.1 181.2 183.7 C 182.7 206.3 185.5 266.7 186.5 285.4 C 187.5 304.1 187.1 293.9 187.4 296.1 C 187.7 298.3 187.8 298.3 188.2 298.7 C 188.6 299.1 189.7 298.7 190.0 298.7 C 190.3 298.7 189.6 312.8 190.0 298.7 C 190.4 284.6 192.4 247.0 192.7 213.8 C 193.0 180.6 191.7 126.8 191.8 99.6 C 191.9 72.4 192.6 63.0 193.5 50.9 C 194.4 38.8 195.5 33.3 197.1 27.0 C 198.7 20.7 201.0 16.6 203.3 12.9 C 205.7 9.2 208.1 7.0 211.2 4.9 C 214.3 2.8 220.1 1.2 221.9 0.5 C 223.7 -0.2 221.9 0.5 221.9 0.5 C 221.9 0.5 221.9 0.5 221.9 0.5 Z';

/* ------------------------------------------------------------------ */
/* 手指几何（参考图蒙版扫描线实测，最终坐标系）                          */
/* ------------------------------------------------------------------ */

/** 指根线（掌指关节）y 坐标：宫牌列的下边界 */
export const FINGER_ROOT_Y = 286.3;

/** 指尖上方留白：宫牌列从 tipY + PLAQUE_TOP 开始 */
export const PLAQUE_TOP = 14;

/** 宫牌纵向间隙 */
export const PLAQUE_GAP = 6;

/** 宫牌横向内缩（单侧） */
export const PLAQUE_INSET = 4.5;

/** 手指布局 id：三根正式手指 + 装饰性小指 */
export type FingerLayoutId = FingerId | 'pinky';

export interface FingerGeom {
  id: FingerLayoutId;
  /** 该指在蒙版上的左右边界（最终坐标系） */
  x0: number;
  x1: number;
  /** 指尖 y */
  tipY: number;
  /** 指干中部宽度（最终坐标系） */
  widthMid: number;
  /** 装饰指（不承载宫位，仅参与形态与金饰） */
  decorative?: boolean;
}

export const FINGERS: readonly FingerGeom[] = [
  { id: 'index', x0: 111.2, x1: 187.4, tipY: 43.8, widthMid: 70.8 },
  { id: 'middle', x0: 191.3, x1: 266.7, tipY: 0.5, widthMid: 74.3 },
  { id: 'ring', x0: 269.7, x1: 345.0, tipY: 46.5, widthMid: 69.0 },
  { id: 'pinky', x0: 352.0, x1: 410.5, tipY: 122.6, widthMid: 51.3, decorative: true },
];

/** 指节顺序：从指尖到手掌 */
export const SEGMENT_ORDER: readonly SegmentId[] = ['distal', 'middle', 'proximal'] as const;

/** 手指中轴 x */
export function fingerCenterX(f: FingerGeom): number {
  return (f.x0 + f.x1) / 2;
}

/** 单个指节的长度（宫牌高度基准） */
export function fingerSegmentLength(f: FingerGeom): number {
  return (FINGER_ROOT_Y - f.tipY - PLAQUE_TOP) / SEGMENT_ORDER.length;
}

/**
 * 指节处手宽（随手指向根部微展宽线性近似）。
 * widthMid 为中部宽，向根部每节 +1.8。
 */
export function fingerSegmentWidth(f: FingerGeom, segmentIdx: number): number {
  return f.widthMid + 1.8 * (segmentIdx - 1);
}

/* ------------------------------------------------------------------ */
/* 九宫单元格布局                                                       */
/* ------------------------------------------------------------------ */

export interface CellLayout {
  /** 宫位算法索引（0 起），即单元格按算法索引寻址 */
  index: number;
  palaceId: string;
  finger: FingerId;
  segment: SegmentId;
  /** 宫牌矩形 */
  x: number;
  y: number;
  width: number;
  height: number;
  /** 中心点（指示器定位基准） */
  cx: number;
  cy: number;
}

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
    const seg = fingerSegmentLength(finger);
    const width = fingerSegmentWidth(finger, segmentIdx) - PLAQUE_INSET * 2;
    const height = seg - PLAQUE_GAP * 2;
    const cx = fingerCenterX(finger);
    const x = cx - width / 2;
    const y = finger.tipY + PLAQUE_TOP + seg * segmentIdx + PLAQUE_GAP;

    cells[palace.index] = {
      index: palace.index,
      palaceId: palace.id,
      finger: palace.finger,
      segment: palace.segment,
      x,
      y,
      width,
      height,
      cx,
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

/* ------------------------------------------------------------------ */
/* 装饰线条（decor-group 数据）                                         */
/* ------------------------------------------------------------------ */

/**
 * 指节界金线：相邻宫牌之间指关节处的微弧横线（非交互装饰）。
 */
export function knuckleLines(): string[] {
  const lines: string[] = [];
  FINGERS.forEach((finger) => {
    if (finger.decorative) return;
    const seg = fingerSegmentLength(finger);
    const cx = fingerCenterX(finger);
    for (let i = 1; i < SEGMENT_ORDER.length; i += 1) {
      const y = finger.tipY + PLAQUE_TOP + seg * i;
      const half = fingerSegmentWidth(finger, i) / 2 - 3;
      lines.push(`M ${(cx - half).toFixed(1)} ${y.toFixed(1)} Q ${cx.toFixed(1)} ${(y + 5).toFixed(1)} ${(cx + half).toFixed(1)} ${y.toFixed(1)}`);
    }
  });
  return lines;
}

/** 云纹卷草：拇指腹两朵 + 小指球一朵（渲染时裁剪进手形） */
export const CLOUD_CURLS: readonly string[] = [
  'M 38 350 q -9 -12 3 -17 q 10 -4 12 5 q 2 8 -7 9',
  'M 64 402 q -8 -10 3 -14 q 9 -3 10 5 q 1 6 -6 7',
  'M 352 386 q 10 -9 17 0 q 5 8 -3 11',
];
