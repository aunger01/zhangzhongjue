/**
 * 门厅（宫制选择页）
 *
 * 应用最外层的分流页：与九宫首页同一场景（掌位图 + 光尘 + 主标题），
 * 但两张入口卡承担的是宫制选择——九宫小六壬 / 六宫小六壬。
 * 选九宫进入九宫首页（生辰起卦 / 心念起卦），选六宫直达六宫起课表单。
 * 顶部品牌钮随时可回到本页重新选择。
 */

import { PalmDiagram } from './PalmDiagram';
import { Motes } from './Motes';
import './HomeView.css';

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
            <p className="home__lead muted">请先择宫制：九宫或六宫。</p>
          </div>

          <div className="home__visual">
            {/*
             * 场景与九宫首页完全同源：同一张掌位图（hero 变体）、同一套入口卡样式。
             * 入口按钮位置纯 CSS 决定，不参与任何算法。
             */}
            <div className="home__palm">
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
