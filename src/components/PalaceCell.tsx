/**
 * 单个指节宫位单元格（SVG 组件）
 *
 * 每个指节区域都是独立可高亮元素，可显示：
 *   宫名 · 序号 · 当前计数 · 起点状态 · 终点状态
 * 状态同时用文字与视觉表示，不单靠颜色区分。
 */

import type { KeyboardEvent } from 'react';
import { getPalaceMeta, type PalaceOmen } from '../features/divination/palaceConstants';
import type { CellLayout } from '../features/divination/palmLayout';

export interface PalaceCellProps {
  cell: CellLayout;
  /** 是否为当前计数位置 */
  active: boolean;
  /** 是否为当前步骤的起宫 */
  isStart: boolean;
  /** 是否已在本步骤的路径中被走过 */
  visited: boolean;
  /** 是否为本步骤落宫（且已落宫） */
  landed: boolean;
  /** 当前计数序号（第几位），仅当前位显示 */
  countBadge: number | null;
  /** 已完成步骤在此宫的落宫标记，例如 ['月', '时'] */
  landedMarks: string[];
  /** 落宫动画序号，变化时重播光圈 */
  pulseSeq: number;
  /** 外部联动高亮（例如首页九宫顺序列表的悬停） */
  highlighted?: boolean;
  interactive: boolean;
  reducedMotion: boolean;
  onSelect?: (index: number) => void;
}

const OMEN_CLASS: Record<PalaceOmen, string> = {
  auspicious: 'cell--auspicious',
  mixed: 'cell--mixed',
  inauspicious: 'cell--inauspicious',
};

export function PalaceCell({
  cell,
  active,
  isStart,
  visited,
  landed,
  countBadge,
  landedMarks,
  pulseSeq,
  highlighted = false,
  interactive,
  reducedMotion,
  onSelect,
}: PalaceCellProps) {
  const meta = getPalaceMeta(cell.index);
  const classNames = [
    'cell',
    `cell--${cell.segment}`,
    OMEN_CLASS[meta.omen],
    active ? 'cell--active-current' : '',
    visited ? 'cell--visited' : '',
    landed ? 'cell--landed' : '',
    isStart ? 'cell--start' : '',
    highlighted ? 'cell--highlight' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleActivate = () => {
    onSelect?.(cell.index);
  };

  const handleKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (!interactive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleActivate();
    }
  };

  return (
    <g
      className={classNames}
      data-testid={`palace-cell-${cell.index}`}
      data-palace={meta.name}
      data-active={active ? 'true' : 'false'}
      data-state={landed ? 'landed' : visited ? 'visited' : isStart ? 'start' : 'idle'}
      role={interactive ? 'button' : 'img'}
      aria-label={`${meta.order}、${meta.name}，${meta.brief}`}
      tabIndex={interactive ? 0 : -1}
      onClick={interactive ? handleActivate : undefined}
      onKeyDown={handleKeyDown}
    >
      {/* 宫牌：外框 + 内衬双线（参考图"牌位卡"样式） */}
      <rect
        className="cell__box"
        x={cell.x}
        y={cell.y}
        width={cell.width}
        height={cell.height}
        rx={9}
        ry={9}
      />
      <rect
        className="cell__box-inner"
        x={cell.x + 3}
        y={cell.y + 3}
        width={cell.width - 6}
        height={cell.height - 6}
        rx={6.5}
        ry={6.5}
      />

      {landed && !reducedMotion ? (
        <circle
          key={`ring-${pulseSeq}`}
          className="land-ring"
          cx={cell.cx}
          cy={cell.cy}
          r={14}
          fill="none"
        />
      ) : null}

      {/* 序号（顶部居中，参考图样式） */}
      <text className="cell__order" x={cell.cx} y={cell.y + 17} textAnchor="middle">
        {meta.order}
      </text>

      {/* 起点 / 终点状态（右上，文字 + 视觉双通道） */}
      {(landed || isStart) && (
        <text
          className={`cell__flag ${landed ? 'cell__flag--land' : 'cell__flag--start'}`}
          x={cell.x + cell.width - 11}
          y={cell.y + 15}
          textAnchor="middle"
        >
          {landed ? '落' : '起'}
        </text>
      )}

      {/* 宫名（居中偏下，让位顶部序号） */}
      <text className="cell__name" x={cell.cx} y={cell.cy + 12} textAnchor="middle">
        {meta.name}
      </text>

      {/* 当前计数序号 */}
      {active && countBadge !== null ? (
        <text
          key={`count-${countBadge}`}
          className="cell__count count-pop"
          x={cell.cx}
          y={cell.y + cell.height - 8}
          textAnchor="middle"
        >
          第 {countBadge} 位
        </text>
      ) : null}

      {/* 已完成步骤的落宫标记 */}
      {landedMarks.length > 0 && !active ? (
        <text className="cell__marks" x={cell.cx} y={cell.y + cell.height - 8} textAnchor="middle">
          {landedMarks.join('·')}落
        </text>
      ) : null}
    </g>
  );
}
