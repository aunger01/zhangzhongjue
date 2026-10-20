/**
 * 首页
 *
 * 主视觉：低亮度九宫掌位图（悬停宫位轻微高亮，触屏不依赖 hover）。
 * 主标题「一念既起，掌中有数。」+ 副标题「以时取数，以掌推演。」
 * 两张主入口卡片：生辰起卦 / 心念起卦。
 * 两张入口按钮横向悬浮于掌心处（生辰起卦 / 心念起卦）。
 * 算法与规则详情由顶部导航的玩法/规则说明弹窗承担。
 */

import { PalmDiagram } from './PalmDiagram';
import { Motes } from './Motes';
import './HomeView.css';

export interface HomeViewProps {
  onSelectBirth: () => void;
  onSelectText: () => void;
  reducedMotion: boolean;
}

export function HomeView({ onSelectBirth, onSelectText, reducedMotion }: HomeViewProps) {
  return (
    <div className="home">
      <section className="home__hero" aria-labelledby="home-title">
        <Motes reducedMotion={reducedMotion} />
        <div className="container home__hero-inner">
          <div className="home__intro anim-fade-up">
            <p className="eyebrow">道门秘术 · 九宫小六壬</p>
            <h1 className="title-main" id="home-title">
              一念既起，
              <br />
              掌中有数。
            </h1>
            <p className="title-sub">以时取数，以掌推演</p>
            <p className="home__lead muted">输入生辰日期与时辰，或写下此刻的心念。</p>
          </div>

          <div className="home__visual">
            {/*
             * home__palm 是手掌的容器：尺寸严格等于掌位图本身，移动端在这里开「裁切窗」。
             * 入口按钮放在它外面 —— 移动端浮在裁切窗下方的留白带里（不压宫名、不贴手掌），
             * 桌面端自然排在掌图正下方做两枚大按钮。
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

            {/* 入口按钮：移动端悬浮于掌窗下方，桌面端落在掌图下方（位置纯 CSS 决定，不参与算法） */}
            <div className="home__entries anim-stagger" role="group" aria-label="选择起卦方式">
              <button
                type="button"
                className="entry-card"
                onClick={onSelectBirth}
                data-testid="entry-birth"
              >
                <span className="entry-card__mark" aria-hidden="true">
                  时
                </span>
                <strong className="entry-card__label">生辰起卦</strong>
              </button>

              <button
                type="button"
                className="entry-card"
                onClick={onSelectText}
                data-testid="entry-text"
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
