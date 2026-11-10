/**
 * 六宫首页（宫制已定：六宫小六壬）
 *
 * 与九宫首页同一场景骨架：掌位图主视觉 + 光尘 + 主标题。
 * 掌图换成六宫布局（复用六宫演算的宫牌与单元格几何），
 * 两张入口卡为取数方式分流：
 *   时辰起卦 → 六宫起课表单（农历月日时）
 *   心念起卦 → 六宫起课表单（自报三数）
 */

import { PalmDiagram } from '../../components/PalmDiagram';
import { Motes } from '../../components/Motes';
import { SIX_PALACE_META } from './sixConstants';
import { SIX_CELL_LAYOUT } from './sixLayout';
import './../../components/HomeView.css';

export interface SixHomeViewProps {
  onSelectCalendar: () => void;
  onSelectReport: () => void;
  reducedMotion: boolean;
}

export function SixHomeView({ onSelectCalendar, onSelectReport, reducedMotion }: SixHomeViewProps) {
  return (
    <div className="home">
      <section className="home__hero" aria-labelledby="six-home-title">
        <Motes reducedMotion={reducedMotion} />
        <div className="container home__hero-inner">
          <div className="home__intro anim-fade-up">
            <p className="eyebrow">道门秘术 · 六宫小六壬</p>
            <h1 className="title-main" id="six-home-title">
              一念既起，
              <br />
              掌中有数。
            </h1>
            <p className="title-sub">以时取数，以掌推演</p>
            <p className="home__lead muted">六宫传统起课：以农历月日时，或报三个心念之数。</p>
          </div>

          <div className="home__visual">
            {/*
             * 场景与九宫首页同源，掌图换六宫布局：
             * 宫牌与单元格几何复用六宫演算界面（SIX_PALACE_META / SIX_CELL_LAYOUT）。
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
                palaceMeta={SIX_PALACE_META}
                cells={SIX_CELL_LAYOUT}
              />
            </div>

            {/* 取数方式入口：与九宫首页入口卡同一套样式（entry-card） */}
            <div className="home__entries anim-stagger" role="group" aria-label="选择取数方式">
              <button
                type="button"
                className="entry-card"
                onClick={onSelectCalendar}
                data-testid="six-entry-calendar"
              >
                <span className="entry-card__mark" aria-hidden="true">
                  时
                </span>
                <strong className="entry-card__label">时辰起卦</strong>
              </button>

              <button
                type="button"
                className="entry-card"
                onClick={onSelectReport}
                data-testid="six-entry-report"
              >
                <span className="entry-card__mark" aria-hidden="true">
                  念
                </span>
                <strong className="entry-card__label">心念起卦</strong>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
