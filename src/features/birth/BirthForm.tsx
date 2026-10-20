/**
 * 生辰起卦表单
 *
 * 支持公历 / 农历切换、闰月标识（仅当所选年份确有该闰月时可勾选）、十二时辰选择。
 * 公历与农历各自保留独立的字段值——切换历法时不会被"重新解释"，
 * 也不会用系统当前日期代替用户输入。
 */

import { useMemo, useState } from 'react';
import {
  DEFAULT_SOLAR,
  LunarConversionError,
  daysInSolarMonth,
  getLeapMonth,
  hasLeapMonth,
  isValidSolarDate,
  lunarMonthDayCount,
  lunarMonthText,
  lunarToSolar,
  solarToLunar,
  solarYearOptions,
  lunarYearOptions,
  SUPPORTED_LUNAR_YEAR_MAX,
  SUPPORTED_LUNAR_YEAR_MIN,
  SUPPORTED_SOLAR_MAX,
  SUPPORTED_SOLAR_MIN,
} from './lunarConverter';
import { SHICHEN, shichenOptionLabel, shichenNumberFromDate } from './timeMapping';
import type { CalendarInfo } from '../divination/types';
import './BirthForm.css';

export interface BirthSubmission {
  mode: 'birth';
  month: number;
  day: number;
  hour: number;
  calendar: CalendarInfo;
}

export interface BirthFormProps {
  onSubmit: (submission: BirthSubmission) => void;
  onCancel: () => void;
}

type CalendarKind = 'solar' | 'lunar';

interface SolarFields {
  year: number;
  month: number;
  day: number;
}

interface LunarFields {
  year: number;
  month: number;
  day: number;
  isLeap: boolean;
}

const SOLAR_YEARS = solarYearOptions();
const LUNAR_YEARS = lunarYearOptions();
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function BirthForm({ onSubmit, onCancel }: BirthFormProps) {
  const [kind, setKind] = useState<CalendarKind>('solar');
  const [solar, setSolar] = useState<SolarFields>({ ...DEFAULT_SOLAR });
  const [lunar, setLunar] = useState<LunarFields>({ year: DEFAULT_SOLAR.year, month: 1, day: 1, isLeap: false });
  const [hour, setHour] = useState<number>(2);
  const [error, setError] = useState<string>('');
  const [switchNotice, setSwitchNotice] = useState<string>('');

  const solarDays = daysInSolarMonth(solar.year, solar.month) ?? 31;
  const leapMonthOfLunarYear = useMemo(() => {
    try {
      return getLeapMonth(lunar.year);
    } catch {
      return 0;
    }
  }, [lunar.year]);
  const lunarDays = useMemo(() => {
    try {
      return lunarMonthDayCount(lunar.year, lunar.month, lunar.isLeap);
    } catch {
      return 30;
    }
  }, [lunar.year, lunar.month, lunar.isLeap]);

  // 闰月仅在所选年份确有该闰月时可选
  const canUseLeap = lunar.isLeap
    ? hasLeapMonth(lunar.year, lunar.month)
    : leapMonthOfLunarYear === lunar.month;

  // 实时换算预览（失败时给出明确提示，不猜结果）
  const preview = useMemo(() => {
    try {
      if (kind === 'solar') {
        if (!isValidSolarDate(solar.year, solar.month, solar.day)) {
          return { ok: false as const, message: '公历日期不合法，请检查年、月、日。' };
        }
        const info = solarToLunar(solar.year, solar.month, solar.day);
        return { ok: true as const, info };
      }
      const info = lunarToSolar(lunar.year, lunar.month, lunar.day, lunar.isLeap);
      return { ok: true as const, info };
    } catch (err) {
      const message =
        err instanceof LunarConversionError ? err.message : '换算失败，请检查输入的日期。';
      return { ok: false as const, message };
    }
  }, [kind, solar, lunar]);

  const switchKind = (next: CalendarKind) => {
    setKind(next);
    setError('');
    setSwitchNotice(
      next === 'lunar'
        ? '已切换到农历输入。公历的数值仍保留在公历栏中，不会被当作农历解释。'
        : '已切换到公历输入。农历的数值仍保留在农历栏中，不会被当作公历解释。',
    );
  };

  const handleSubmit = () => {
    setError('');
    if (!preview.ok) {
      setError(preview.message);
      return;
    }
    const info = preview.info;
    onSubmit({
      mode: 'birth',
      month: info.lunar.month,
      day: info.lunar.day,
      hour,
      calendar: info,
    });
  };

  const fillNow = () => {
    const now = new Date();
    setKind('solar');
    setSolar({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
    setHour(shichenNumberFromDate(now));
    setSwitchNotice('已按你点击时的本地时间填入公历日期与时辰，仍可自由修改。');
  };

  return (
    <form
      className="card birth-form"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit();
      }}
    >
      <div className="spread">
        <h2 className="section-title">生辰起卦</h2>
        <div className="segmented" role="group" aria-label="日期类型">
          <button
            type="button"
            className="segmented__item"
            aria-pressed={kind === 'solar'}
            onClick={() => switchKind('solar')}
            data-testid="kind-solar"
          >
            公历
          </button>
          <button
            type="button"
            className="segmented__item"
            aria-pressed={kind === 'lunar'}
            onClick={() => switchKind('lunar')}
            data-testid="kind-lunar"
          >
            农历
          </button>
        </div>
      </div>

      {switchNotice ? <p className="notice">{switchNotice}</p> : null}

      {kind === 'solar' ? (
        <div className="birth-form__grid">
          <label className="field">
            <span className="field__label">公历年</span>
            <select
              className="select"
              value={solar.year}
              onChange={(event) => {
                const year = Number(event.target.value);
                const maxDay = daysInSolarMonth(year, solar.month) ?? 31;
                setSolar((prev) => ({ ...prev, year, day: Math.min(prev.day, maxDay) }));
              }}
              data-testid="solar-year"
            >
              {SOLAR_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">公历月</span>
            <select
              className="select"
              value={solar.month}
              onChange={(event) => {
                const month = Number(event.target.value);
                const maxDay = daysInSolarMonth(solar.year, month) ?? 31;
                setSolar((prev) => ({ ...prev, month, day: Math.min(prev.day, maxDay) }));
              }}
              data-testid="solar-month"
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">公历日</span>
            <select
              className="select"
              value={solar.day}
              onChange={(event) => setSolar((prev) => ({ ...prev, day: Number(event.target.value) }))}
              data-testid="solar-day"
            >
              {Array.from({ length: solarDays }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : (
        <div className="birth-form__grid">
          <label className="field">
            <span className="field__label">农历年</span>
            <select
              className="select"
              value={lunar.year}
              onChange={(event) => {
                const year = Number(event.target.value);
                setLunar((prev) => ({ ...prev, year, isLeap: false }));
              }}
              data-testid="lunar-year"
            >
              {LUNAR_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">农历月</span>
            <select
              className="select"
              value={lunar.month}
              onChange={(event) => {
                const month = Number(event.target.value);
                setLunar((prev) => ({
                  ...prev,
                  month,
                  isLeap: prev.isLeap && hasLeapMonth(prev.year, month),
                }));
              }}
              data-testid="lunar-month"
            >
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {lunarMonthText(month, false)}
                  {leapMonthOfLunarYear === month ? '（该年有闰月）' : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span className="field__label">农历日</span>
            <select
              className="select"
              value={lunar.day}
              onChange={(event) => setLunar((prev) => ({ ...prev, day: Number(event.target.value) }))}
              data-testid="lunar-day"
            >
              {Array.from({ length: lunarDays }, (_, index) => index + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>

          <label className={`field birth-form__leap ${canUseLeap ? '' : 'is-disabled'}`}>
            <span className="field__label">闰月</span>
            <span className="birth-form__check">
              <input
                type="checkbox"
                checked={lunar.isLeap}
                disabled={!canUseLeap}
                onChange={(event) => setLunar((prev) => ({ ...prev, isLeap: event.target.checked }))}
                data-testid="lunar-leap"
              />
              <span>
                {leapMonthOfLunarYear > 0
                  ? `该农历年闰${lunarMonthText(leapMonthOfLunarYear, false)}${canUseLeap ? '' : '（请先选到该月）'}`
                  : '该农历年没有闰月'}
              </span>
            </span>
          </label>
        </div>
      )}

      <div className="birth-form__grid">
        <label className="field">
          <span className="field__label">时辰</span>
          <select
            className="select"
            value={hour}
            onChange={(event) => setHour(Number(event.target.value))}
            data-testid="hour-select"
          >
            {SHICHEN.map((shichen) => (
              <option key={shichen.number} value={shichen.number}>
                {shichenOptionLabel(shichen)}
              </option>
            ))}
          </select>
        </label>
        <div className="field birth-form__helper">
          <span className="field__label">快捷</span>
          <button type="button" className="btn btn--sm btn--ghost" onClick={fillNow}>
            按此刻时间填入
          </button>
        </div>
      </div>

      <div className="birth-form__preview" data-testid="birth-preview" aria-live="polite">
        {preview.ok ? (
          <>
            <p className="birth-form__preview-line">
              <span className="badge badge--gold">换算结果</span>
              {preview.info.displayText}
              {preview.info.lunar.isLeapMonth ? <span className="badge badge--teal">闰月</span> : null}
              <span className="faint">
                对应公历 {preview.info.solar.year}-{preview.info.solar.month}-
                {preview.info.solar.day}
              </span>
            </p>
            <p className="birth-form__numbers">
              起数：公历
              {preview.info.solar.year}-{preview.info.solar.month}-{preview.info.solar.day}{' '}
              → {preview.info.displayText}，{SHICHEN[hour - 1].name}；起数{' '}
              <strong className="mono-num">
                {preview.info.lunar.month}、{preview.info.lunar.day}、{hour}
              </strong>
            </p>
          </>
        ) : (
          <p className="notice notice--warn">{preview.message}</p>
        )}
      </div>

      <p className="faint">
        支持范围：公历 {SUPPORTED_SOLAR_MIN.year}-{SUPPORTED_SOLAR_MIN.month}-
        {SUPPORTED_SOLAR_MIN.day} 至 {SUPPORTED_SOLAR_MAX.year}-{SUPPORTED_SOLAR_MAX.month}-
        {SUPPORTED_SOLAR_MAX.day}，农历第 {SUPPORTED_LUNAR_YEAR_MIN}–
        {SUPPORTED_LUNAR_YEAR_MAX} 年；超出范围会明确报错，不会猜测。
      </p>

      {error ? (
        <p className="notice notice--error" data-testid="birth-error">
          {error}
        </p>
      ) : null}

      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={!preview.ok} data-testid="birth-submit">
          开始掐指
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          返回
        </button>
      </div>
    </form>
  );
}
