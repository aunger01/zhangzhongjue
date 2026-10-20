/**
 * 文字起卦表单（传统笔画取数）
 *
 * 规则公开、可展开明细：相同文字必然得到相同的三个数。
 * 由用户自己写下一至三个汉字，程序不替其截取；两字从大安起日；单字再从大安起日、日上起时。
 * 原文只在当前页面内存中使用，默认不保存。
 */

import { useMemo, useState } from 'react';
import { TEXT_HARD_MAX, countHanCharacters, validateTextInput } from './textNumbering';
import {
  STROKE_CHAR_COUNT,
  STROKE_SOURCE_LABELS,
  analyzeText,
  currentShichenNumber,
  formatNumbers,
  type StrokeAnalysis,
  type StrokeNumberingDetail,
} from './strokeNumbering';
import { SHICHEN } from '../birth/timeMapping';
import './TextForm.css';

export interface TextSubmission {
  mode: 'text';
  month: number;
  day: number;
  hour: number;
  detail: StrokeNumberingDetail;
}

export interface TextFormProps {
  onSubmit: (submission: TextSubmission) => void;
  onCancel: () => void;
}

const PLACEHOLDER = '写下一到三个字，如「心安」「可成」。按第一反应写，不必反复挑选。';

/** 由分析结果推出界面提示 */
function noticeOf(analysis: StrokeAnalysis, count: number): { level: string; message: string } {
  if (!analysis.ok) {
    return { level: 'error', message: analysis.message };
  }
  if (count === 1) {
    return { level: 'warn', message: '一个字：取本字笔画作日数，末位补时辰。' };
  }
  if (count === 2) {
    return { level: 'warn', message: '两个字：从大安起日、日上起时。' };
  }
  return { level: 'ok', message: '三个字：取其笔画，依次起月、日、时。' };
}

export function TextForm({ onSubmit, onCancel }: TextFormProps) {
  const [text, setText] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  // 仅单字起卦时使用；预填当前时辰便于直接提交，用户可改
  const [hour, setHour] = useState<number>(() => currentShichenNumber());

  const validation = useMemo(() => validateTextInput(text), [text]);
  const count = countHanCharacters(text);

  const analysis = useMemo(() => {
    if (text.trim() === '' || count === 0) return null;
    return analyzeText(text, { hour, maxCount: TEXT_HARD_MAX });
  }, [text, count, hour]);

  const canSubmit = validation.canSubmit && analysis !== null && analysis.ok;
  const notice = analysis ? noticeOf(analysis, count) : null;

  const handleSubmit = () => {
    if (!analysis || !analysis.ok) return;
    const { detail } = analysis;
    onSubmit({
      mode: 'text',
      month: detail.numbers[0],
      day: detail.numbers[1],
      hour: detail.numbers[2],
      detail,
    });
  };

  return (
    <form
      className="card text-form"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <div className="spread">
        <h2 className="section-title">心念起卦</h2>
        <span className="badge" data-testid="text-count">
          {count > STROKE_CHAR_COUNT
            ? `已写 ${count} 字 · 上限 ${STROKE_CHAR_COUNT}`
            : `有效汉字 ${count} 字`}
        </span>
      </div>

      <label className="field">
        <span className="field__label">心念文字</span>
        <textarea
          className="textarea"
          value={text}
          placeholder={PLACEHOLDER}
          maxLength={TEXT_HARD_MAX}
          onChange={(event) => setText(event.target.value)}
          aria-describedby="text-help"
          data-testid="text-input"
        />
      </label>

      <p id="text-help" className="faint">
        请写 1～{STROKE_CHAR_COUNT} 个汉字，<strong>取哪几个字由您自己定</strong>——取字即取象，程序不会替您截取。
        一个字补时辰，两个字从大安起日，三个字依次作月、日、时。
        空格、换行、标点、数字与字母均不计入。原文只在本页内存中使用，不会上传或保存。
      </p>

      {/* 单字起卦：传统需补时辰（从大安起日、日上起时） */}
      {count === 1 ? (
        <label className="field text-form__hour">
          <span className="field__label">补时辰（单字起卦用）</span>
          <select
            className="select"
            value={hour}
            onChange={(event) => setHour(Number(event.target.value))}
            data-testid="text-hour"
          >
            {SHICHEN.map((item) => (
              <option key={item.number} value={item.number}>
                {item.name}（{item.range}）
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div
        className={`notice ${
          notice === null
            ? 'notice--warn'
            : notice.level === 'error'
              ? 'notice--error'
              : notice.level === 'warn'
                ? 'notice--warn'
                : 'notice--ok'
        }`}
        aria-live="polite"
        data-testid="text-validation"
      >
        {notice === null ? validation.message : notice.message}
      </div>

      {analysis && analysis.ok ? (
        <div className="text-form__result" data-testid="text-numbers">
          <p className="text-form__numbers">
            起数：
            <strong className="mono-num">{formatNumbers(analysis.detail.numbers)}</strong>
            <span className="faint">
              （
              {analysis.detail.padded
                ? analysis.detail.hour !== null
                  ? '少字起课，已从大安起日、日上起时'
                  : '少字起课，已从大安起日'
                : `取「${analysis.detail.chars.map((item) => item.char).join('')}」`}
              ）
            </span>
          </p>

          <button
            type="button"
            className="btn btn--sm btn--ghost"
            aria-expanded={showDetail}
            onClick={() => setShowDetail((value) => !value)}
          >
            {showDetail ? '收起取数明细' : '展开取数明细'}
          </button>

          {showDetail ? (
            <dl className="text-form__detail">
              <div>
                <dt>有效汉字</dt>
                <dd data-testid="text-han">{analysis.detail.hanCharacters.join('')}</dd>
              </div>
              {analysis.detail.chars.map((item, index) => (
                <div key={`${item.char}-${index}`}>
                  <dt>
                    {STROKE_SOURCE_LABELS[analysis.detail.sources[index]]} ·「{item.char}」
                  </dt>
                  <dd className="mono-num">
                    {item.stroke} 画 → {item.number}
                  </dd>
                </div>
              ))}
              {analysis.detail.padded ? (
                <div>
                  <dt>补位</dt>
                  <dd className="mono-num">1（大安起日）</dd>
                </div>
              ) : null}
              {analysis.detail.hour !== null ? (
                <div>
                  <dt>补时辰</dt>
                  <dd className="mono-num">
                    {analysis.detail.hourName}（{analysis.detail.hour}）
                  </dd>
                </div>
              ) : null}
              <div>
                <dt>归约公式</dt>
                <dd className="mono-num">((笔画 − 1) mod 9) + 1</dd>
              </div>
              <div>
                <dt>最终起数</dt>
                <dd className="mono-num">{formatNumbers(analysis.detail.numbers)}</dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}

      <div className="row">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!canSubmit}
          data-testid="text-submit"
        >
          开始掐指
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          返回
        </button>
      </div>
    </form>
  );
}
