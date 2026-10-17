/**
 * 掌位图（SVG 主视觉）
 *
 * 掌心朝向用户的手掌矢量插画：食指在左、中指居中、无名指在右、小指与拇指为装饰。
 * 九个宫位严格贴合对应指节（不使用 3×3 方格代替）。
 *
 * 坐标来自 palmLayout（可独立调整），算法顺序来自 palaceConstants，
 * 两者解耦：改插画不会改变任何计算结果。
 */

import { PALACE_META } from '../features/divination/palaceConstants';
import {
  CELL_LAYOUT,
  FINGERS,
  PALM_BODY_PATH,
  PALM_CREASES,
  PALM_VIEWBOX,
  THUMB_PATH,
  fingerLabelAnchor,
  fingerPath,
  knuckleLines,
} from '../features/divination/palmLayout';
import { FingerPointer } from './FingerPointer';
import { PalaceCell } from './PalaceCell';
import './PalmDiagram.css';

export interface PalmDiagramProps {
  /** 当前计数所在宫位索引（来自算法路径） */
  activeIndex: number | null;
  /** 当前步骤起宫索引 */
  startIndex: number | null;
  /** 当前步骤落宫索引 */
  resultIndex: number | null;
  /** 当前步骤已走过的宫位 */
  visitedIndices: readonly number[];
  /** 当前计数序号（第几位） */
  countBadge: number | null;
  /** 各宫的已完成步骤落宫标记：{ [宫位索引]: ['月','日'] } */
  landedMarksByIndex: Record<number, string[]>;
  /** 是否显示掐指指示器 */
  showPointer: boolean;
  /** 当前是否处于落宫状态 */
  landed: boolean;
  /** 落宫动画序号 */
  pulseSeq: number;
  reducedMotion: boolean;
  /** 外部联动高亮（例如首页九宫顺序列表的悬停） */
  highlightIndex?: number | null;
  interactive?: boolean;
  onSelect?: (index: number) => void;
  /** hero：首页低亮度主视觉；session：演算界面 */
  variant?: 'hero' | 'session';
  className?: string;
}

export function PalmDiagram({
  activeIndex,
  startIndex,
  resultIndex,
  visitedIndices,
  countBadge,
  landedMarksByIndex,
  showPointer,
  landed,
  pulseSeq,
  reducedMotion,
  highlightIndex = null,
  interactive = false,
  onSelect,
  variant = 'session',
  className = '',
}: PalmDiagramProps) {
  const prefix = `palm-${variant}`;
  const visited = new Set(visitedIndices);
  const creaseLength = 520;

  const activeMeta = activeIndex !== null ? PALACE_META[activeIndex] : null;
  const ariaLabel = activeMeta
    ? `九宫掌位图，当前计数落在${activeMeta.order}、${activeMeta.name}（${activeMeta.finger === 'index' ? '食指' : activeMeta.finger === 'middle' ? '中指' : '无名指'}）`
    : '九宫掌位图，掌心朝向用户，食指、中指、无名指上共九个指节宫位';

  return (
    <figure className={`palm-figure palm-figure--${variant} ${className}`.trim()}>
      <svg
        className="palm-svg"
        viewBox={`${PALM_VIEWBOX.minX} ${PALM_VIEWBOX.minY} ${PALM_VIEWBOX.width} ${PALM_VIEWBOX.height}`}
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
        style={{ ['--pointer-fill' as string]: `url(#${prefix}-pointer)` }}
      >
        <title>{ariaLabel}</title>
        <defs>
          <radialGradient id={`${prefix}-skin`} cx="46%" cy="26%" r="78%">
            <stop offset="0%" stopColor="#1b3129" />
            <stop offset="58%" stopColor="#132420" />
            <stop offset="100%" stopColor="#0a1613" />
          </radialGradient>
          <radialGradient id={`${prefix}-pointer`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(242, 221, 167, 0.42)" />
            <stop offset="70%" stopColor="rgba(212, 169, 79, 0.12)" />
            <stop offset="100%" stopColor="rgba(212, 169, 79, 0)" />
          </radialGradient>
        </defs>

        {/* 手掌底色与掌纹 */}
        <g className={variant === 'hero' ? 'palm-base palm-emerge' : 'palm-base'}>
          <path className="palm-fill" d={PALM_BODY_PATH} fill={`url(#${prefix}-skin)`} />
          <path className="palm-fill" d={THUMB_PATH} fill={`url(#${prefix}-skin)`} />
          {FINGERS.map((finger) => (
            <path
              key={`finger-${finger.id}`}
              className={`palm-fill ${finger.decorative ? 'palm-fill--decorative' : ''}`}
              d={fingerPath(finger)}
              fill={`url(#${prefix}-skin)`}
            />
          ))}

          {PALM_CREASES.map((d, index) => (
            <path
              key={`crease-${index}`}
              className="palm-crease crease"
              d={d}
              style={{ ['--crease-len' as string]: `${creaseLength}` }}
            />
          ))}

          {knuckleLines().map((line, index) => (
            <line
              key={`knuckle-${index}`}
              className="knuckle-line"
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
            />
          ))}

          {/* 掌形轮廓（描边在最上层，保证边缘清晰） */}
          <path className="palm-outline trace-line" d={PALM_BODY_PATH} />
          <path className="palm-outline trace-line" d={THUMB_PATH} />
          {FINGERS.map((finger) => (
            <path
              key={`outline-${finger.id}`}
              className="palm-outline trace-line"
              d={fingerPath(finger)}
            />
          ))}
        </g>

        {/* 手指名称标注 */}
        <g className="finger-labels" aria-hidden="true">
          {FINGERS.map((finger) => {
            const anchor = fingerLabelAnchor(finger);
            return (
              <text
                key={`label-${finger.id}`}
                className={finger.decorative ? 'finger-label finger-label--dim' : 'finger-label'}
                x={anchor.x}
                y={anchor.y}
                textAnchor="middle"
              >
                {anchor.label}
              </text>
            );
          })}
        </g>

        {/* 九宫指节 */}
        <g className="palace-cells">
          {CELL_LAYOUT.map((cell) => (
            <PalaceCell
              key={cell.palaceId}
              cell={cell}
              active={activeIndex === cell.index}
              isStart={startIndex === cell.index}
              visited={visited.has(cell.index)}
              landed={landed && resultIndex === cell.index}
              countBadge={activeIndex === cell.index ? countBadge : null}
              landedMarks={landedMarksByIndex[cell.index] ?? []}
              pulseSeq={pulseSeq}
              highlighted={highlightIndex === cell.index}
              interactive={interactive}
              reducedMotion={reducedMotion}
              onSelect={onSelect}
            />
          ))}
        </g>

        {/* 掐指指示器 */}
        {showPointer && activeIndex !== null ? (
          <FingerPointer index={activeIndex} reducedMotion={reducedMotion} landed={landed} />
        ) : null}
      </svg>
    </figure>
  );
}
