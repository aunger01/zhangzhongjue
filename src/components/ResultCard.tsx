/**
 * 单宫结果卡片
 * 展示：宫名 · 序号 · 起数 · 起宫 · 落宫 · 完整计数路径 · 简短象意
 */

import { useState } from 'react';
import type { StepReading } from '../features/interpretation/composeResult';
import './ResultCard.css';

export interface ResultCardProps {
  reading: StepReading;
  /** 是否为最终收束的一步 */
  isFinal?: boolean;
}

const OMEN_LABEL: Record<StepReading['omen'], string> = {
  auspicious: '偏吉',
  inauspicious: '偏滞',
  mixed: '中平',
};

export function ResultCard({ reading, isFinal = false }: ResultCardProps) {
  const [showPath, setShowPath] = useState(false);

  return (
    <article
      className={`result-card card result-card--${reading.omen} ${isFinal ? 'result-card--final' : ''}`}
      data-testid={`result-card-${reading.step}`}
      data-palace={reading.palaceName}
    >
      <header className="result-card__head">
        <span className="badge badge--gold">{reading.stepLabel}宫</span>
        {isFinal ? <span className="badge badge--teal">收束</span> : null}
        <span className={`badge ${reading.omen === 'auspicious' ? 'badge--gold' : reading.omen === 'inauspicious' ? 'badge--cinnabar' : 'badge--teal'}`}>
          {OMEN_LABEL[reading.omen]}
        </span>
      </header>

      <div className="result-card__palace">
        <h3 className="result-card__name" data-testid={`result-name-${reading.step}`}>
          {reading.palaceName}
        </h3>
        <span className="result-card__order mono-num">第 {reading.order} 位</span>
      </div>

      <p className="result-card__summary">{reading.positionalText}</p>

      <dl className="result-card__facts">
        <div>
          <dt>起数</dt>
          <dd className="mono-num">{reading.inputNumber}</dd>
        </div>
        <div>
          <dt>起宫</dt>
          <dd>{reading.startName}</dd>
        </div>
        <div>
          <dt>落宫</dt>
          <dd className="result-card__landed">{reading.palaceName}</dd>
        </div>
        <div>
          <dt>路径</dt>
          <dd className="mono-num">{reading.pathNames.length} 位</dd>
        </div>
      </dl>

      <button
        type="button"
        className="btn btn--sm btn--ghost result-card__toggle"
        aria-expanded={showPath}
        onClick={() => setShowPath((value) => !value)}
      >
        {showPath ? '收起计数路径' : '查看完整计数路径'}
      </button>

      {showPath ? (
        <ol className="result-card__path" aria-label={`${reading.stepLabel}宫完整计数路径`}>
          {reading.pathNames.map((name, index) => (
            <li
              key={`${index}-${name}`}
              className={index === reading.pathNames.length - 1 ? 'is-landed' : ''}
            >
              <span className="mono-num">{index + 1}</span>
              {name}
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}
