/**
 * 门厅（宫制选择页）
 *
 * 应用最外层的分流页：与九宫首页同一场景（掌位图 + 光尘 + 主标题），
 * 但两张入口卡承担的是宫制选择——九宫小六壬 / 六宫小六壬。
 * 选九宫进入九宫首页（生辰起卦 / 心念起卦），选六宫直达六宫起课表单。
 * 顶部品牌钮随时可回到本页重新选择。
 */

import { useEffect, useState } from 'react';
import { PalmDiagram } from './PalmDiagram';
import { Motes } from './Motes';
import { SIX_PALACE_META } from '../features/six/sixConstants';
import { SIX_CELL_LAYOUT } from '../features/six/sixLayout';
import './HomeView.css';
import './GateView.css';

/**
 * 🔱 门厅宫制轮换开关（一行回退）：
 * 置 false 即回到静态九宫掌图（2026-11-10 之前的状态），无任何其他改动需要撤销。
 * 轮换动画只存在于本文件与 GateView.css，不触碰 PalmDiagram / HomeView。
 */
const GATE_PALM_CYCLE_ENABLED = true;

/** 每种宫制停留时长（毫秒） */
const GATE_CYCLE_INTERVAL_MS = 6000;

/**
 * 门厅掌图轮换：九宫 ↔ 六宫「散开—收拢」特效切换。
 * 两层掌图同用手形几何（PalmDiagram 完全复用），只有宫牌与宫位格不同；
 * 九宫层占常规流撑起容器，六宫层绝对定位叠放。
 * 切换编排：在位宫牌层旋转放大 + 模糊散去，新宫牌层自散乱中旋转收拢落定（带轻微回弹），
 * 每次轮换交替方向（gate-cycle--alt），连续看两轮不重样。
 * 注：本特效为圣上钦定的装饰动效，不受系统「减少动效」降级（GateView.css 不再对其 media query 让步）；
 * 铭牌入场动画仍尊重该设置。开关关闭时只渲染静态九宫层。
 */
function GatePalmCycle({ reducedMotion }: { reducedMotion: boolean }) {
  const [showNine, setShowNine] = useState(true);
  const [flip, setFlip] = useState(false);
  /** 特效闸门：首次轮换后才开闸，挂载瞬间不演，免得六宫层误触「散去」而在首屏闪一下 */
  const [switched, setSwitched] = useState(false);
  const cycleOn = GATE_PALM_CYCLE_ENABLED;

  useEffect(() => {
    if (!cycleOn) return undefined;
    const id = window.setInterval(() => {
      setShowNine((v) => !v);
      setFlip((f) => !f);
      setSwitched(true);
    }, GATE_CYCLE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [cycleOn]);

  const stateClass =
    `${cycleOn && !showNine ? ' is-six' : ' is-nine'}` +
    `${flip ? ' gate-cycle--alt' : ''}` +
    `${switched ? ' gate-cycle--armed' : ''}`;

  return (
    <div className={`gate-cycle${stateClass}`} data-testid="gate-palm-cycle">
      <div className="gate-cycle__layer gate-cycle__layer--nine">
        <PalmDiagram
          activeIndex={null}
          startIndex={null}
          resultIndex={null}
          visitedIndices={[]}
          countBadge={null}
          landedMarksByIndex={{}}
          showPointer={false}
          landed={false}
          pulseSeq={0}
          reducedMotion={reducedMotion}
          variant="hero"
        />
      </div>
      {cycleOn ? (
        <div className="gate-cycle__layer gate-cycle__layer--six" aria-hidden="true">
          <PalmDiagram
            activeIndex={null}
            startIndex={null}
            resultIndex={null}
            visitedIndices={[]}
            countBadge={null}
            landedMarksByIndex={{}}
            showPointer={false}
            landed={false}
            pulseSeq={0}
            reducedMotion={reducedMotion}
            variant="hero"
            palaceMeta={SIX_PALACE_META}
            cells={SIX_CELL_LAYOUT}
          />
        </div>
      ) : null}
    </div>
  );
}

export interface GateViewProps {
  onSelectNine: () => void;
  onSelectSix: () => void;
  reducedMotion: boolean;
}

export function GateView({ onSelectNine, onSelectSix, reducedMotion }: GateViewProps) {
  return (
    <div className="home">
      <section className="home__hero" aria-labelledby="gate-title">
        <Motes reducedMotion={reducedMotion} />
        <div className="container home__hero-inner">
          <div className="home__intro anim-fade-up">
            <p className="eyebrow">道门秘术 · 掌中诀</p>
            <h1 className="title-main" id="gate-title">
              一念既起，
              <br />
              掌中有数。
            </h1>
            <p className="title-sub">以时取数，以掌推演</p>
            <p className="home__lead muted">请选起宫之法：新兴九宫起卦，或古法六宫起卦。</p>
          </div>

          <div className="home__visual">
            {/*
             * 场景与九宫首页完全同源：同一套掌位图与入口卡样式。
             * 掌图由 GatePalmCycle 承担：九宫 ↔ 六宫定时交叉淡入淡出（开关可回退）。
             */}
            <div className="home__palm">
              <GatePalmCycle reducedMotion={reducedMotion} />
            </div>

            {/* 宫制入口：与首页入口卡同一套样式（entry-card） */}
            <div className="home__entries anim-stagger" role="group" aria-label="选择宫制">
              <button
                type="button"
                className="entry-card"
                onClick={onSelectNine}
                data-testid="gate-nine"
              >
                <span className="entry-card__mark" aria-hidden="true">
                  九
                </span>
                <strong className="entry-card__label">九宫小六壬</strong>
              </button>

              <button
                type="button"
                className="entry-card"
                onClick={onSelectSix}
                data-testid="gate-six"
              >
                <span className="entry-card__mark" aria-hidden="true">
                  六
                </span>
                <strong className="entry-card__label">六宫小六壬</strong>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
