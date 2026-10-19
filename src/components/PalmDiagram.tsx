/**
 * 掌位图（SVG 主视觉）
 *
 * 掌心朝向用户的手掌矢量插画：食指在左、中指居中、无名指在右、
 * 小指与拇指为装饰。九个宫位严格贴合对应指节（不使用 3×3 方格代替）。
 *
 * 手形来自《九宫小六壬神掌》参考图矢量化（见 palmLayout.ts 头注）。
 * 按圣上要求拆分为三个独立 SVG 分组，便于网页适配与交互：
 *
 *   <g class="palm-outline-group">  手掌轮廓：剪影填充 + 皮肤噪点 + 明暗 + 金线描边
 *                                   （整组套底部渐隐 mask，腕部自然淡出）
 *   <g class="palm-decor-group">    装饰线条：云纹卷草（裁剪进手形）/ 指节界金线
 *   <g class="palace-cells">        九宫文字与宫牌（PalaceCell，交互层）
 *
 * 坐标来自 palmLayout（可独立调整），算法顺序来自 palaceConstants，
 * 两者解耦：改插画不会改变任何计算结果。
 */

import { PALACE_META } from '../features/divination/palaceConstants';
import {
  CELL_LAYOUT,
  CLOUD_CURLS,
  HAND_PATH,
  PALM_VIEWBOX,
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
  const knuckles = knuckleLines();

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
          {/* 手底色：墨绿径向渐变（左上受光，整体压暗） */}
          <radialGradient id={`${prefix}-skin`} cx="0.42" cy="0.35" r="0.95">
            <stop offset="0%" stopColor="#234a38" />
            <stop offset="55%" stopColor="#163023" />
            <stop offset="100%" stopColor="#0b1c14" />
          </radialGradient>
          {/* 明暗叠加：左上暖光 → 右下沉暗 */}
          <linearGradient
            id={`${prefix}-shade`}
            gradientUnits="userSpaceOnUse"
            x1="80"
            y1="0"
            x2="380"
            y2="640"
          >
            <stop offset="0%" stopColor="rgba(242, 221, 167, 0.07)" />
            <stop offset="46%" stopColor="rgba(242, 221, 167, 0.01)" />
            <stop offset="100%" stopColor="rgba(0, 0, 0, 0.3)" />
          </linearGradient>
          <radialGradient id={`${prefix}-pointer`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(242, 221, 167, 0.42)" />
            <stop offset="70%" stopColor="rgba(212, 169, 79, 0.12)" />
            <stop offset="100%" stopColor="rgba(212, 169, 79, 0)" />
          </radialGradient>
          {/* 皮肤噪点质感：细密磨砂，模拟线描版画的纸面颗粒 */}
          <filter id={`${prefix}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.83  0 0 0 0 0.66  0 0 0 0 0.31  0 0 0 0.55 0"
            />
          </filter>
          {/* 金色发光（装饰线条共用） */}
          <filter id={`${prefix}-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <clipPath id={`${prefix}-hand-clip`}>
            <path d={HAND_PATH} />
          </clipPath>
          {/* 底部渐隐：从掌心下方开始淡出，至腕底（y≈622）完全透明 */}
          <linearGradient
            id={`${prefix}-fade`}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="384"
            x2="0"
            y2="622"
          >
            <stop offset="0%" stopColor="#fff" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask
            id={`${prefix}-fade-mask`}
            maskUnits="userSpaceOnUse"
            x={PALM_VIEWBOX.minX}
            y={PALM_VIEWBOX.minY}
            width={PALM_VIEWBOX.width}
            height={PALM_VIEWBOX.height}
          >
            <rect
              x={PALM_VIEWBOX.minX}
              y={PALM_VIEWBOX.minY}
              width={PALM_VIEWBOX.width}
              height={PALM_VIEWBOX.height}
              fill={`url(#${prefix}-fade)`}
            />
          </mask>
        </defs>

        {/* ═══ 第 1 层：手掌轮廓（独立分组，底部渐隐） ═══ */}
        <g
          className={variant === 'hero' ? 'palm-outline-group palm-base palm-emerge' : 'palm-outline-group palm-base'}
          mask={`url(#${prefix}-fade-mask)`}
        >
          <path className="palm-fill" d={HAND_PATH} fill={`url(#${prefix}-skin)`} />
          <g clipPath={`url(#${prefix}-hand-clip)`}>
            <rect
              className="palm-grain"
              x={PALM_VIEWBOX.minX}
              y={PALM_VIEWBOX.minY}
              width={PALM_VIEWBOX.width}
              height={PALM_VIEWBOX.height}
              filter={`url(#${prefix}-grain)`}
            />
          </g>
          <path className="palm-shade" d={HAND_PATH} fill={`url(#${prefix}-shade)`} />
          {/* 金线描边：主描边 + 极淡亮金内衬（pathLength 归一化供描绘动画） */}
          <path className="palm-outline trace-line" d={HAND_PATH} pathLength={900} />
          <path className="palm-outline-inner" d={HAND_PATH} />
        </g>

        {/* ═══ 第 2 层：装饰线条（独立分组，随掌形底部渐隐） ═══ */}
        <g className="palm-decor-group" mask={`url(#${prefix}-fade-mask)`}>
          {/* 云纹卷草：裁剪进手形（不画掌纹——掌纹涉相学定论，留白胜过臆造） */}
          <g clipPath={`url(#${prefix}-hand-clip)`}>
            {CLOUD_CURLS.map((d, index) => (
              <path key={`curl-${index}`} className="palm-curl" d={d} />
            ))}
          </g>

          {/* 指节界金线（宫牌之间的关节弧线） */}
          {knuckles.map((d, index) => (
            <path key={`knuckle-${index}`} className="palm-knuckle-line" d={d} />
          ))}
        </g>

        {/* ═══ 第 3 层：九宫文字与宫牌（独立分组，交互层） ═══ */}
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
