/**
 * 六宫 · 结果页
 *
 * 结构沿用九宫结果页：总览 → 三张宫位卡 → 综合解读 → 断词 → 合规说明 → 底部操作条。
 * 六宫多出的部分是传统法本身带来的：
 *   · 起宫依据（事由 / 占人）与取数说明；
 *   · 六神断词（PDF 原诗，逐字照录）；
 *   · 用神生克提示与三宫五行同类提示；
 *   · 自报三数时的数字释义。
 */

import { useMemo, useState } from 'react';
import { ResultCard } from '../../components/ResultCard';
import { SIX_ALGORITHM_NAME, SIX_ALGORITHM_VERSION, getSixPalaceMeta } from './sixConstants';
import type { SixResult } from './sixCalculate';
import type { SixInterpretation } from './sixMeanings';
import type { CalendarInfo } from '../divination/types';
import { copyText, downloadBlob, renderShareCard } from '../share/shareCard';
import '../../components/ResultPage.css';
import './SixResultPage.css';

export interface SixResultPageProps {
  result: SixResult;
  interpretation: SixInterpretation;
  inputSummary: string;
  numbersText: string;
  /** 取数说明（农历月日时 / 自报三数与归约） */
  numbersNote: string;
  calendar?: CalendarInfo | null;
  onReplay: () => void;
  onNewDivination: () => void;
}

export function SixResultPage({
  result,
  interpretation,
  inputSummary,
  numbersText,
  numbersNote,
  calendar,
  onReplay,
  onNewDivination,
}: SixResultPageProps) {
  const [shareState, setShareState] = useState('');

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
      metaLine: `${createdText} · 六宫传统起课`,
      palaces: interpretation.steps.map((reading) => ({
        label: `${reading.stepLabel}宫`,
        name: reading.palaceName,
        count: reading.inputNumber,
      })),
      headline: interpretation.headline,
      blocks: [
        { title: '整体判断', paragraphs: [interpretation.overall, interpretation.combination] },
        {
          title: '逐步解析',
          paragraphs: interpretation.steps.map((reading) => `${reading.role}：${reading.text}`),
        },
        {
          title: '六神断词',
          paragraphs: interpretation.verses.map(
            (verse) => `${verse.stepLabel}位${verse.palaceName}：${verse.lines.join('')}`,
          ),
        },
        ...(interpretation.topicVerses.length > 0
          ? [
              {
                title: '断课歌诀',
                items: interpretation.topicVerses.map(
                  (item) => `${item.stepLabel}位${item.palaceName}：${item.verse}`,
                ),
              },
            ]
          : []),
        {
          title: '用神与喜忌',
          paragraphs: [
            interpretation.yongshen.basis,
            ...interpretation.yongshen.notes,
            ...(interpretation.sameElementNote ? [interpretation.sameElementNote] : []),
          ],
        },
        { title: '积极因素', items: interpretation.positives },
        { title: '需要留意', items: interpretation.cautions },
        {
          title: '行动建议',
          items: interpretation.advice.map((item, index) => `${index + 1}. ${item}`),
        },
      ],
      footer: '掌中诀 · 六宫小六壬 ｜ 仅供传统文化体验与自我省思，不构成任何专业建议。',
    });
    if (!blob) {
      setShareState('当前浏览器不支持本地生成图片，可改用「复制结果文字」。');
      return;
    }
    downloadBlob(blob, `掌中诀-六宫-${interpretation.steps.map((s) => s.palaceName).join('-')}.png`);
    setShareState('分享卡片已在本地生成并开始下载，未经过任何服务器。');
  };

  const originMeta = getSixPalaceMeta(result.input.originIndex);

  return (
    <section className="result container six-result" aria-label="六宫占测结果">
      <header className="card result__header">
        <div className="spread">
          <div>
            <p className="eyebrow">六宫小六壬 · 占测结果</p>
            <h2 className="result__title">
              月宫 {interpretation.steps[0].palaceName} · 日宫 {interpretation.steps[1].palaceName} ·
              时宫 {interpretation.steps[2].palaceName}
            </h2>
          </div>
          <div className="result__meta">
            <span className="badge badge--gold">{SIX_ALGORITHM_NAME}</span>
            <span className="badge mono-num">版本 {SIX_ALGORITHM_VERSION}</span>
            <span className="badge mono-num">{createdText}</span>
          </div>
        </div>

        <dl className="result__summary">
          <div>
            <dt>起宫依据</dt>
            <dd data-testid="six-result-origin">
              {result.input.originLabel}（{originMeta.guardian}·{originMeta.element}）
            </dd>
          </div>
          <div>
            <dt>占测时辰</dt>
            <dd data-testid="six-result-input-summary">{inputSummary}</dd>
          </div>
          <div>
            <dt>起数</dt>
            <dd className="mono-num" data-testid="six-result-numbers">
              {numbersText}
            </dd>
          </div>
          <div>
            <dt>取数说明</dt>
            <dd>{numbersNote}</dd>
          </div>
          {calendar ? (
            <div>
              <dt>历法换算</dt>
              <dd>
                公历 {calendar.solar.year}-{calendar.solar.month}-{calendar.solar.day} →{' '}
                {calendar.displayText}
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="result__headline" data-testid="six-result-headline">
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

        <article className="card six-result__verses">
          <h3 className="card__title">六神断词（依原文）</h3>
          <ul className="six-result__verse-list">
            {interpretation.verses.map((verse) => (
              <li key={verse.step}>
                <span className="badge badge--gold">
                  {verse.stepLabel}位 · {verse.palaceName}
                </span>
                <p className="six-result__verse-text">{verse.lines.join('')}</p>
              </li>
            ))}
          </ul>
        </article>

        {interpretation.topicVerses.length > 0 ? (
          <article className="card six-result__verses">
            <h3 className="card__title">断课歌诀（依事由）</h3>
            <p className="faint six-result__verse-lead">
              依所问事由对应的歌诀直接断课，与下方断词互为参证。
            </p>
            <ul className="six-result__verse-list">
              {interpretation.topicVerses.map((item) => (
                <li key={item.step} data-testid={`six-topic-verse-${item.step}`}>
                  <span className="badge badge--gold">
                    {item.stepLabel}位 · {item.palaceName}
                  </span>
                  <p className="six-result__verse-text">{item.verse}。</p>
                </li>
              ))}
            </ul>
          </article>
        ) : null}

        <article className="card" data-testid="six-yongshen">
          <h3 className="card__title">用神与喜忌</h3>
          <p className="result__text">{interpretation.yongshen.basis}</p>
          <ul className="result__list">
            {interpretation.yongshen.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          {interpretation.sameElementNote ? (
            <p className="result__text note-warn">{interpretation.sameElementNote}</p>
          ) : null}
          {interpretation.numberNotes.length > 0 ? (
            <>
              <h4 className="card__title six-result__subtitle">自报三数释义</h4>
              <ul className="result__list">
                {interpretation.numberNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </>
          ) : null}
        </article>

        <article className="card">
          <h3 className="card__title">逐步解析</h3>
          <ul className="result__list result__list--steps">
            {interpretation.steps.map((reading) => (
              <li key={reading.step}>
                <span className="badge badge--gold">
                  {reading.stepLabel}位 · {reading.role}
                </span>
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
        <p className="faint result__disclaimer">
          六宫起课与断词依《小六壬精华》整理；落宫公式为本站公开实现，可逐步核对。
        </p>
      </div>

      <div className="result__dock" role="group" aria-label="结果操作">
        {shareState ? (
          <p className="result__dock-note" aria-live="polite" data-testid="six-share-state">
            {shareState}
          </p>
        ) : null}
        <div className="result__dock-row">
          <button type="button" className="btn btn--primary" onClick={onReplay} data-testid="six-btn-replay">
            回看过程
          </button>
          <button type="button" className="btn" onClick={onNewDivination} data-testid="six-btn-new">
            再次占测
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleCopy} data-testid="six-btn-copy">
            复制结果
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleShareCard} data-testid="six-btn-share-card">
            分享结果
          </button>
        </div>
      </div>
    </section>
  );
}
