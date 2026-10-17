/**
 * 文字心念起卦表单
 *
 * 输入框提示语、实时有效字数统计、空白不可提交；
 * 取数规则完全公开（可展开明细），相同文字必然得到相同数字。
 * 原文只在当前页面内存中使用，默认不保存。
 */

import { useMemo, useState } from 'react';
import {
  TEXT_HARD_MAX,
  TEXT_MIN_RECOMMENDED,
  TEXT_NUMBER_RANGE,
  countHanCharacters,
  textToNumbers,
  validateTextInput,
} from './textNumbering';
import type { TextNumberingDetail } from '../divination/types';
import './TextForm.css';

export interface TextSubmission {
  mode: 'text';
  month: number;
  day: number;
  hour: number;
  detail: TextNumberingDetail;
}

export interface TextFormProps {
  onSubmit: (submission: TextSubmission) => void;
  onCancel: () => void;
}

const PLACEHOLDER = '写下你此刻最想知道的事。无需刻意组织语言，按第一反应输入即可。';

export function TextForm({ onSubmit, onCancel }: TextFormProps) {
  const [text, setText] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  const validation = useMemo(() => validateTextInput(text), [text]);
  const count = countHanCharacters(text);
  const numbers = useMemo(
    () => (validation.canSubmit ? textToNumbers(text) : null),
    [text, validation.canSubmit],
  );

  const handleSubmit = () => {
    if (!numbers) return;
    onSubmit({
      mode: 'text',
      month: numbers.numbers[0],
      day: numbers.numbers[1],
      hour: numbers.numbers[2],
      detail: numbers,
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
          有效汉字 {count} 字
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
        推荐 {TEXT_MIN_RECOMMENDED}～30 个有效汉字；空格、换行与标点不计入，表情符号不算汉字。
        最多 {TEXT_HARD_MAX} 字。原文只在本页内存中使用，不会上传或保存。
      </p>

      <div
        className={`notice ${
          validation.level === 'error' ? 'notice--error' : validation.level === 'warn' ? 'notice--warn' : 'notice--ok'
        }`}
        aria-live="polite"
        data-testid="text-validation"
      >
        {validation.message}
      </div>

      {numbers ? (
        <div className="text-form__result" data-testid="text-numbers">
          <p className="text-form__numbers">
            起数：
            <strong className="mono-num">
              {numbers.numbers[0]}、{numbers.numbers[1]}、{numbers.numbers[2]}
            </strong>
            <span className="faint">（取数范围 1～{TEXT_NUMBER_RANGE}）</span>
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
                <dd data-testid="text-han">{numbers.hanCharacters.join('')}</dd>
              </div>
              <div>
                <dt>A · 汉字数量</dt>
                <dd className="mono-num">{numbers.count}</dd>
              </div>
              <div>
                <dt>B · 码点值之和</dt>
                <dd className="mono-num">{numbers.codePointSum}</dd>
              </div>
              <div>
                <dt>C · 码点平方和</dt>
                <dd className="mono-num">{numbers.codePointSquareSum}</dd>
              </div>
              <div>
                <dt>归一化公式</dt>
                <dd className="mono-num">((n − 1) mod {numbers.range}) + 1</dd>
              </div>
              <div>
                <dt>最终起数</dt>
                <dd className="mono-num">
                  {numbers.numbers[0]}、{numbers.numbers[1]}、{numbers.numbers[2]}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      ) : null}

      <div className="row">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!validation.canSubmit}
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
