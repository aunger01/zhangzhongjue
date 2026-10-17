/**
 * 掐指指示器（SVG 组件）
 *
 * 位置完全由算法落点驱动：父组件传入算法路径中的宫位索引，
 * 这里只负责"移动到哪个指节"，不允许自行推算下一步。
 * 大数计数时前段快速移动、接近落宫时减速（节奏由 buildPath 计算）。
 */

import { cellFor } from '../features/divination/palmLayout';

export interface FingerPointerProps {
  /** 目标宫位索引（来自算法路径） */
  index: number;
  reducedMotion: boolean;
  /** 是否处于落宫状态（停止移动，展示光圈） */
  landed: boolean;
}

export function FingerPointer({ index, reducedMotion, landed }: FingerPointerProps) {
  const cell = cellFor(index);

  return (
    <g
      className={`pointer ${landed ? 'pointer--landed' : ''}`}
      style={{
        transform: `translate(${cell.cx}px, ${cell.cy}px)`,
        transition: reducedMotion ? 'none' : 'transform 240ms cubic-bezier(0.3, 0.72, 0.28, 1)',
      }}
      data-testid="finger-pointer"
      data-pointer-index={index}
      aria-hidden="true"
    >
      {/* 指尖：以按下的手指意象指向当前指节 */}
      <path
        className="pointer__finger"
        d="M -14 -96 L -14 -46 A 14 14 0 0 0 14 -46 L 14 -96 Z"
      />
      <path className="pointer__finger-edge" d="M -14 -96 L -14 -46 A 14 14 0 0 0 14 -46 L 14 -96" />

      {/* 光环与核心 */}
      <circle className="pointer__halo" r={30} />
      <circle className="pointer__ring" r={15} />
      <circle className="pointer__core" r={5.5} />
    </g>
  );
}
