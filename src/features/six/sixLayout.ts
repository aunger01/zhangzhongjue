/**
 * 六宫掌位几何（视觉层，与算法严格分离）
 *
 * ⚠️ 纪律同 palmLayout.ts：本文件只描述"画在哪里"。
 * 手形、指节几何、装饰线条全部复用九宫那套（同一只手、同一套坐标），
 * 仅把宫牌换成六宫的五指定位——六宫只落在"根 / 尖"两节。
 *
 * 六宫定位（PDF 第 1 页）：大安食指根 ｜ 留连食指尖 ｜ 速喜中指尖
 *                          赤口无名指尖 ｜ 小吉无名指根 ｜ 空亡中指根
 */

import {
  FINGERS,
  PLAQUE_GAP,
  PLAQUE_TOP,
  PLAQUE_INSET,
  SEGMENT_ORDER,
  fingerCenterX,
  fingerSegmentLength,
  fingerSegmentWidth,
  type CellLayout,
} from '../divination/palmLayout';
import { SIX_PALACE_META, type SixPalaceMeta } from './sixConstants';

function buildSixCellLayout(): CellLayout[] {
  const cells: CellLayout[] = new Array(SIX_PALACE_META.length);

  SIX_PALACE_META.forEach((palace: SixPalaceMeta) => {
    const finger = FINGERS.find((f) => f.id === palace.finger);
    if (!finger) throw new Error(`六宫掌位配置缺少手指：${palace.finger}`);
    const segmentIdx = SEGMENT_ORDER.indexOf(palace.segment);
    if (segmentIdx < 0) throw new Error(`六宫掌位配置缺少指节：${palace.segment}`);

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
 * 六宫单元格布局，按算法索引寻址：SIX_CELL_LAYOUT[算法索引]。
 * 与九宫 CELL_LAYOUT 同构，可交给同一个 PalmDiagram 渲染。
 */
export const SIX_CELL_LAYOUT: readonly CellLayout[] = buildSixCellLayout();

/** 依据算法索引取六宫单元格 */
export function sixCellFor(index: number): CellLayout {
  const cell = SIX_CELL_LAYOUT[index];
  if (!cell) throw new Error(`六宫掌位图缺少宫位单元格：索引 ${index}`);
  return cell;
}
