/**
 * 结果页
 *
 * 结构（与需求文档 8. 一致）：
 *   结果总览 → 三张结果卡片 → 综合解读（整体判断 / 逐步解析 / 积极因素 / 需要留意 / 行动建议）
 *   → 合规说明；底部固定操作条（回看过程 / 再次占测 / 复制结果 / 分享结果）常驻屏幕底部，
 *     随页面滚动但不遮挡内容（页面底部已留出避让空间）。
 */

import { useMemo, useState } from 'react';
import { ResultCard } from './ResultCard';
import { ALGORITHM_NAME, ALGORITHM_VERSION } from '../features/divination/palaceConstants';
import type { CalendarInfo, DivinationResult } from '../features/divination/types';
import type { ComposedInterpretation } from '../features/interpretation/composeResult';
import { copyText, downloadBlob, renderShareCard } from '../features/share/shareCard';
import './ResultPage.css';

export interface ResultPageProps {
  result: DivinationResult;
  interpretation: ComposedInterpretation;
  /** 输入摘要文本 */
  inputSummary: string;
  /** 起数文本，例如 "5、20、2" */
  numbersText: string;
  /** 生辰模式的历法信息 */
  calendar?: CalendarInfo | null;
  /** 文字模式的取数说明 */
  textNote?: string | null;
  onReplay: () => void;
  onNewDivination: () => void;
}

export function ResultPage({
  result,
  interpretation,
  inputSummary,
  numbersText,
  calendar,
  textNote,
  onReplay,
  onNewDivination,
}: ResultPageProps) {
  const [shareState, setShareState] = useState<string>('');

  const createdText = useMemo(() => {
    const date = new Date(result.createdAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
      date.getHours(),
    )}:${pad(date.getMinutes())}`;
  }, [result.createdAt]);

  const handleCopy = async () => {
    const ok = await copyText(interpretation.shareText);
    setShareState(ok ? '结果文字已复制到剪贴板。' : '复制失败，请手动选择文本复制。');
  };

  const handleShareCard = async () => {
    setShareState('正在本地生成分享卡片……');
    const blob = await renderShareCard({
      inputSummary,
      numbersText,
      metaLine: `${createdText} · ${result.input.mode === 'birth' ? '生辰起卦' : '文字心念起卦'}`,
      palaces: interpretation.steps.map((reading) => ({
        label: `${reading.stepLabel}宫`,
        name: reading.palaceName,
        count: reading.inputNumber,
      })),
      headline: interpretation.headline,
      // 卡片内容与页面展示完全对应：不截断、不省略
      blocks: [
        {
          title: '整体判断',
          paragraphs: [interpretation.overall, interpretation.combination],
        },
        {
          title: '逐步解析',
          paragraphs: interpretation.steps.map(
            (reading) => `${reading.role}：${reading.text}`,
          ),
        },
        { title: '积极因素', items: interpretation.positives },
        { title: '需要留意', items: interpretation.cautions },
        {
          title: '行动建议',
          items: interpretation.advice.map((item, index) => `${index + 1}. ${item}`),
        },
      ],
      footer: '掌中诀 · 九宫小六壬 ｜ 仅供传统文化体验与自我省思，不构成任何专业建议。',
    });
    if (!blob) {
      setShareState('当前浏览器不支持本地生成图片，可改用「复制结果文字」。');
      return;
    }
    downloadBlob(blob, `掌中诀-${interpretation.steps.map((s) => s.palaceName).join('-')}.png`);
    setShareState('分享卡片已在本地生成并开始下载，未经过任何服务器。');
  };

  return (
    <section className="result container" aria-label="占测结果">
      <header className="card result__header">
        <div className="spread">
          <div>
            <p className="eyebrow">占测结果</p>
            <h2 className="result__title">
              月宫 {interpretation.steps[0].palaceName} · 日宫 {interpretation.steps[1].palaceName} ·
              时宫 {interpretation.steps[2].palaceName}
            </h2>
          </div>
          <div className="result__meta">
            <span className="badge badge--gold">{ALGORITHM_NAME}</span>
            <span className="badge mono-num">版本 {ALGORITHM_VERSION}</span>
            <span className="badge mono-num">{createdText}</span>
          </div>
        </div>

        <dl className="result__summary">
          <div>
            <dt>占测方式</dt>
            <dd>{result.input.mode === 'birth' ? '生辰起卦' : '文字心念起卦'}</dd>
          </div>
          <div>
            <dt>输入摘要</dt>
            <dd data-testid="result-input-summary">{inputSummary}</dd>
          </div>
          <div>
            <dt>起数</dt>
            <dd className="mono-num" data-testid="result-numbers">
              {numbersText}
            </dd>
          </div>
          {calendar ? (
            <div>
              <dt>历法换算</dt>
              <dd>
                公历 {calendar.solar.year}-{calendar.solar.month}-{calendar.solar.day} →{' '}
                {calendar.displayText}
                {calendar.lunar.yearInGanZhi ? `（${calendar.lunar.yearInGanZhi}年）` : ''}
              </dd>
            </div>
          ) : null}
          {textNote ? (
            <div>
              <dt>取数方法</dt>
              <dd>{textNote}</dd>
            </div>
          ) : null}
        </dl>

        <p className="result__headline" data-testid="result-headline">
          {interpretation.headline}
        </p>
        <ul className="result__keywords">
          {interpretation.keywords.map((keyword) => (
            <li key={keyword} className="badge">
              {keyword}
            </li>
          ))}
        </ul>
      </header>

      <div className="result__cards">
        {interpretation.steps.map((reading, index) => (
          <ResultCard key={reading.step} reading={reading} isFinal={index === 2} />
        ))}
      </div>

      <div className="result__reading">
        <article className="card">
          <h3 className="card__title">整体判断</h3>
          <p className="result__text">{interpretation.overall}</p>
          <p className="result__text">{interpretation.combination}</p>
        </article>

        <article className="card">
          <h3 className="card__title">逐步解析</h3>
          <ul className="result__list result__list--steps">
            {interpretation.steps.map((reading) => (
              <li key={reading.step}>
                <span className="badge badge--gold">{reading.stepLabel}宫 · {reading.role}</span>
                <p className="result__text">{reading.text}</p>
              </li>
            ))}
          </ul>
        </article>

        <div className="result__grid">
          <article className="card">
            <h3 className="card__title">积极因素</h3>
            <ul className="result__list">
              {interpretation.positives.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="card">
            <h3 className="card__title">需要留意</h3>
            <ul className="result__list result__list--caution">
              {interpretation.cautions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <article className="card">
          <h3 className="card__title">行动建议</h3>
          <ol className="result__advice">
            {interpretation.advice.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </article>

      </div>

      <div className="card result__notes">
        <p className="faint result__disclaimer">{interpretation.disclaimer}</p>
        <p className="faint result__disclaimer">{interpretation.privacy}</p>
      </div>

      {/* 底部常驻操作条：悬浮固定于屏幕底部，页面内容已留出避让空间 */}
      <div className="result__dock" role="group" aria-label="结果操作">
        {shareState ? (
          <p className="result__dock-note" aria-live="polite" data-testid="share-state">
            {shareState}
          </p>
        ) : null}
        <div className="result__dock-row">
          <button type="button" className="btn btn--primary" onClick={onReplay} data-testid="btn-replay">
            回看过程
          </button>
          <button type="button" className="btn" onClick={onNewDivination} data-testid="btn-new">
            再次占测
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleCopy} data-testid="btn-copy">
            复制结果
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleShareCard} data-testid="btn-share-card">
            分享结果
          </button>
        </div>
      </div>
    </section>
  );
}
