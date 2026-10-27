/**
 * 六宫小六壬 · 起课表单（传统六宫法）
 *
 * 与九宫表单的区别全部在"玩法"：
 *   1. 起宫不固定——由事由（起课歌诀）或占人（男/女）决定，空亡不起课；
 *   2. 取数可用农历月日时（默认按此刻预填），也可用变通取数法自报三数；
 *   3. 落宫走六宫循环（模 6），不是九宫。
 *
 * 历法换算会拉起 lunar-javascript，故此表单在 App 中按需加载。
 */

import { useMemo, useState } from 'react';
import {
  SIX_PERSON_ORIGIN,
  SIX_STEP_SUBJECT,
  SIX_TOPICS,
  getSixTopic,
  sixPalaceIndex,
  type SixPalaceName,
  type SixTopicId,
} from './sixConstants';
import {
  SIX_REPORT_MAX,
  SIX_REPORT_MIN,
  sixReduceReportNumber,
  type SixNumbersSource,
} from './sixCalculate';
import { sixNumberNote } from './sixMeanings';
import { SHICHEN, shichenByNumber, shichenNumberFromDate } from '../birth/timeMapping';
import { lunarDayText, lunarMonthText, solarToLunar } from '../birth/lunarConverter';
import type { CalendarInfo } from '../divination/types';
import './SixForm.css';

export interface SixSubmission {
  mode: 'six';
  originIndex: number;
  originName: SixPalaceName;
  originLabel: string;
  /** 起宫依据的事由 id（通用 / 占人为 null） */
  topicId: SixTopicId | null;
  month: number;
  day: number;
  hour: number;
  numbersNote: string;
  numbersSource: SixNumbersSource;
  numberNotes: string[];
  calendar: CalendarInfo | null;
}

export interface SixFormProps {
  onSubmit: (submission: SixSubmission) => void;
}

/** 起宫依据的选项值：topic:<id> / person:male|female */
type BasisValue = `topic:${SixTopicId}` | `person:${keyof typeof SIX_PERSON_ORIGIN}`;

interface ResolvedBasis {
  originIndex: number;
  originName: SixPalaceName;
  /** 事由 id（占人 / 自定义为 null） */
  topicId: SixTopicId | null;
  label: string;
  palaceLabel: string;
}

function resolveBasis(value: BasisValue): ResolvedBasis {
  if (value.startsWith('person:')) {
    const gender = value.slice('person:'.length) as keyof typeof SIX_PERSON_ORIGIN;
    const config = SIX_PERSON_ORIGIN[gender];
    return {
      originIndex: sixPalaceIndex(config.origin),
      originName: config.origin,
      topicId: null,
      label: `占人（${gender === 'male' ? '男' : '女'}）· ${config.origin}起课`,
      palaceLabel: gender === 'male' ? '重阳' : '重阴',
    };
  }
  const topicId = value.slice('topic:'.length) as SixTopicId;
  const topic = getSixTopic(topicId);
  return {
    originIndex: sixPalaceIndex(topic.origin),
    originName: topic.origin,
    topicId: topic.id,
    label: `${topic.label}（${topic.palaceLabel}·${topic.origin}）`,
    palaceLabel: topic.palaceLabel,
  };
}

/** 此刻的农历月、日与时辰（传统起课以问事之时为基准） */
function currentMoment(): { month: number; day: number; hour: number; calendar: CalendarInfo | null } {
  const now = new Date();
  const hour = shichenNumberFromDate(now);
  try {
    const calendar = solarToLunar(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return { month: calendar.lunar.month, day: calendar.lunar.day, hour, calendar };
  } catch {
    return { month: 1, day: 1, hour, calendar: null };
  }
}

export function SixForm({ onSubmit }: SixFormProps) {
  const initial = useMemo(() => currentMoment(), []);
  const [basis, setBasis] = useState<BasisValue | ''>('');
  const [source, setSource] = useState<SixNumbersSource>('calendar');
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [hour, setHour] = useState(initial.hour);
  const [calendar, setCalendar] = useState<CalendarInfo | null>(initial.calendar);
  const [raw, setRaw] = useState<[number, number, number]>([8, 15, 7]);

  const resolved = useMemo(() => (basis ? resolveBasis(basis) : null), [basis]);

  const reducedReport = useMemo(
    () =>
      raw.map((value) =>
        Number.isInteger(value) && value >= SIX_REPORT_MIN && value <= SIX_REPORT_MAX
          ? sixReduceReportNumber(value)
          : null,
      ) as Array<number | null>,
    [raw],
  );

  const reportValid = reducedReport.every((value) => value !== null);

  const numbers = source === 'calendar' ? { month, day, hour } : {
    month: reducedReport[0] ?? 0,
    day: reducedReport[1] ?? 0,
    hour: reducedReport[2] ?? 0,
  };

  const canSubmit = basis !== '' && (source === 'calendar' ? true : reportValid);

  const numbersNote =
    source === 'calendar'
      ? `农历${lunarMonthText(month, false)}${lunarDayText(day)} · ${shichenByNumber(hour).name}`
      : `自报 ${raw[0]}、${raw[1]}、${raw[2]} → 归约 ${reducedReport.map((v) => v ?? '—').join('、')}`;

  const numberNotes = source === 'report' ? raw.map((value) => sixNumberNote(value)) : [];

  const handleRefreshNow = () => {
    const fresh = currentMoment();
    setMonth(fresh.month);
    setDay(fresh.day);
    setHour(fresh.hour);
    setCalendar(fresh.calendar);
  };

  const handleSubmit = () => {
    if (!canSubmit || !resolved) return;
    onSubmit({
      mode: 'six',
      originIndex: resolved.originIndex,
      originName: resolved.originName,
      originLabel: resolved.label,
      topicId: resolved.topicId,
      month: numbers.month,
      day: numbers.day,
      hour: numbers.hour,
      numbersNote,
      numbersSource: source,
      numberNotes,
      calendar: source === 'calendar' ? calendar : null,
    });
  };

  return (
    <form
      className="card six-form"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <div className="spread">
        <h2 className="section-title">六宫小六壬</h2>
        <span className="badge badge--gold">传统起课法 · 模 6</span>
      </div>

      {/* ---------- 一、起课方式（必选） ---------- */}
      <label className="field">
        <span className="field__label">起课方式</span>
        <select
          className="select"
          value={basis}
          onChange={(event) => setBasis(event.target.value as BasisValue)}
          required
          data-testid="six-basis"
        >
          <option value="" disabled hidden>
            请选择问占方向
          </option>
          <optgroup label="依事由起课">
            {SIX_TOPICS.map((topic) => (
              <option key={topic.id} value={`topic:${topic.id}`}>
                {topic.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="依问占之人起课">
            <option value="person:female">问占之人（女）</option>
            <option value="person:male">问占之人（男）</option>
          </optgroup>
        </select>
      </label>

      {/* ---------- 二、取数方式 ---------- */}
      <div className="six-form__source">
        <span className="field__label">取数方式</span>
        <div className="segmented" role="group" aria-label="取数方式">
          <button
            type="button"
            className="segmented__item"
            aria-pressed={source === 'calendar'}
            onClick={() => setSource('calendar')}
            data-testid="six-source-calendar"
          >
            农历月日时
          </button>
          <button
            type="button"
            className="segmented__item"
            aria-pressed={source === 'report'}
            onClick={() => setSource('report')}
            data-testid="six-source-report"
          >
            自报三数
          </button>
        </div>
      </div>

      {source === 'calendar' ? (
        <>
          <div className="six-form__grid">
            <label className="field">
              <span className="field__label">农历月份</span>
              <select
                className="select"
                value={month}
                onChange={(event) => setMonth(Number(event.target.value))}
                data-testid="six-month"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {lunarMonthText(value, false)}（{value}）
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">农历日期</span>
              <select
                className="select"
                value={day}
                onChange={(event) => setDay(Number(event.target.value))}
                data-testid="six-day"
              >
                {Array.from({ length: 30 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {lunarDayText(value)}（{value}）
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="field__label">时辰</span>
              <select
                className="select"
                value={hour}
                onChange={(event) => setHour(Number(event.target.value))}
                data-testid="six-hour"
              >
                {SHICHEN.map((item) => (
                  <option key={item.number} value={item.number}>
                    {item.name}（{item.number}）
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="six-form__moment">
            <button type="button" className="btn btn--sm btn--ghost" onClick={handleRefreshNow}>
              取此刻（按现在的时间重填）
            </button>
            <span className="faint">
              {calendar
                ? `公历 ${calendar.solar.year}-${calendar.solar.month}-${calendar.solar.day} → 农历${calendar.lunar.monthInChinese}月${calendar.lunar.dayInChinese}日`
                : '历法换算不可用时可手动选择农历月日时'}
              ，{shichenByNumber(hour).name}（{shichenByNumber(hour).range}）
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="six-form__grid">
            {(['一', '二', '三'] as const).map((label, index) => (
              <label className="field" key={label}>
                <span className="field__label">第{label}数</span>
                <input
                  className="input mono-num"
                  type="number"
                  min={SIX_REPORT_MIN}
                  max={SIX_REPORT_MAX}
                  value={raw[index]}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    setRaw((prev) => {
                      const copy: [number, number, number] = [...prev];
                      copy[index] = Number.isFinite(next) ? Math.trunc(next) : 0;
                      return copy;
                    });
                  }}
                  data-testid={`six-raw-${index}`}
                />
              </label>
            ))}
          </div>

          <p className="faint">
            任意取三个数（第一印象即可）：电话尾数、座位号、随手想到的数都行。
            范围 {SIX_REPORT_MIN}～{SIX_REPORT_MAX}；大于 12 的数按{' '}
            <span className="mono-num">((n − 1) mod 12) + 1</span> 归约后入数——
            因 12 是 6 的倍数，归约只缩短计数过程，<strong>不改变落宫</strong>。
          </p>

          <div className={`notice ${reportValid ? 'notice--ok' : 'notice--error'}`} aria-live="polite">
            {reportValid
              ? `归约后入数：${reducedReport.join('、')}`
              : `三个数都须为 ${SIX_REPORT_MIN}～${SIX_REPORT_MAX} 的整数。`}
          </div>
        </>
      )}

      {/* ---------- 三、预览 ---------- */}
      <div className="six-form__preview" data-testid="six-preview">
        <div>
          <span className="field__label">起宫</span>
          <strong className="six-form__origin">{resolved ? resolved.originName : '——'}</strong>
          {resolved ? (
            <span className="faint">（{resolved.palaceLabel}）</span>
          ) : (
            <span className="faint">　请先选择起课方式</span>
          )}
        </div>
        <div>
          <span className="field__label">起数</span>
          <strong className="mono-num">
            {numbers.month}、{numbers.day}、{numbers.hour}
          </strong>
          <span className="faint">　{numbersNote}</span>
        </div>
      </div>

      <div className="row">
        <button
          type="submit"
          className="btn btn--primary"
          disabled={!canSubmit}
          data-testid="six-submit"
        >
          开始掐指
        </button>
      </div>

      <p className="faint six-form__note">
        断课提示：{SIX_STEP_SUBJECT.month}为月位，{SIX_STEP_SUBJECT.day}为日位，{SIX_STEP_SUBJECT.hour}为时位。
      </p>
    </form>
  );
}
