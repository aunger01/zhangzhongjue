/**
 * 六宫 · 掐指演算界面
 *
 * 逻辑照搬九宫 SessionView：同一套冻结结果、同一套状态机与节奏，
 * 差别只在——宫位元数据来自六宫表，掌图只画六个宫牌，标题注明起宫依据。
 * 演算过程中同样不展示完整计数路径，回看由结果页承担。
 */

import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { PalmDiagram } from '../../components/PalmDiagram';
import { STEP_LABELS, STEP_TITLES } from '../divination/types';
import type { UseDivinationMachineResult } from '../divination/useDivinationMachine';
import { soundEngine } from '../audio/soundEngine';
import { getSixPalaceMeta } from './sixConstants';
import type { SixResult } from './sixCalculate';
import { SIX_CELL_LAYOUT } from './sixLayout';
import { SIX_PALACE_META } from './sixConstants';
import '../../components/SessionView.css';
import './SixSessionView.css';

export interface SixSessionViewProps {
  result: SixResult;
  machine: UseDivinationMachineResult;
  reducedMotion: boolean;
  inputSummary: ReactNode;
  onBackToInput: () => void;
}

const SPEED_OPTIONS = [0.5, 1, 2] as const;

function nextSpeed(current: number): number {
  const index = SPEED_OPTIONS.findIndex((option) => option === current);
  return SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length];
}

export function SixSessionView({
  result,
  machine,
  reducedMotion,
  inputSummary,
  onBackToInput,
}: SixSessionViewProps) {
  const {
    state,
    currentStep,
    activePalaceIndex,
    stepStartIndex,
    stepResultIndex,
    currentOrdinal,
    progress,
    actions,
  } = machine;

  const { phase, stepIndex, cursor, landingSeq, autoContinue, speed } = state;

  const pathsLength = currentStep?.pathIndices.length ?? 0;
  const isAnimating = phase === 'ANIMATING';
  const isPaused = phase === 'PAUSED';
  const isStepComplete = phase === 'STEP_COMPLETE';
  const isReady = phase === 'READY';
  const isLastStep = stepIndex >= result.steps.length - 1;

  const prevCursor = useRef(cursor);
  useEffect(() => {
    if (isAnimating && cursor !== prevCursor.current) soundEngine.play('click');
    prevCursor.current = cursor;
  }, [cursor, isAnimating]);

  const prevLanding = useRef(landingSeq);
  useEffect(() => {
    if (landingSeq !== prevLanding.current && isStepComplete) soundEngine.play('land');
    prevLanding.current = landingSeq;
  }, [landingSeq, isStepComplete]);

  const visitedIndices = useMemo(
    () => (currentStep ? currentStep.pathIndices.slice(0, cursor + 1) : []),
    [currentStep, cursor],
  );

  const landedMarksByIndex = useMemo(() => {
    const marks: Record<number, string[]> = {};
    result.steps.forEach((step, index) => {
      const finished = index < stepIndex || (index === stepIndex && isStepComplete);
      if (!finished) return;
      const label = STEP_LABELS[step.step];
      marks[step.resultIndex] = [...(marks[step.resultIndex] ?? []), label];
    });
    return marks;
  }, [result.steps, stepIndex, isStepComplete]);

  const landed = isStepComplete && stepResultIndex !== null;
  const activeMeta = activePalaceIndex !== null ? getSixPalaceMeta(activePalaceIndex) : null;
  const startMeta = stepStartIndex !== null ? getSixPalaceMeta(stepStartIndex) : null;
  const resultMeta = stepResultIndex !== null ? getSixPalaceMeta(stepResultIndex) : null;

  const statusText = (() => {
    if (isReady) return '手掌就位，即将开始掐指……';
    if (isAnimating) return '掐指推演中（六宫循环）';
    if (isPaused) return '已暂停，可随时继续';
    if (isStepComplete) return `本步落宫：${resultMeta?.name ?? ''}`;
    return '';
  })();

  const canGoPrev = stepIndex > 0;
  const canGoNext = isStepComplete && !isLastStep;
  const canSeeResult = isStepComplete && isLastStep;
  const showBackToInput = isReady || isPaused;

  return (
    <section className="session container six-session" aria-label="六宫掐指演算">
      <div className="session__head card">
        <div className="spread">
          <div>
            <p className="eyebrow">当前步骤</p>
            <h2 className="session__step-title">
              {currentStep ? STEP_TITLES[currentStep.step] : '准备中'}
            </h2>
          </div>
          <div className="session__head-meta">
            <span className="badge badge--gold mono-num">起数 {currentStep?.inputNumber ?? '—'}</span>
            <span className="badge">起宫 {startMeta?.name ?? '—'}</span>
          </div>
        </div>

        <p className="session__status" data-testid="six-session-status" aria-live="polite">
          <span
            className={`session__dot ${isAnimating ? 'session__dot--live breathe' : ''} ${
              isPaused ? 'session__dot--paused' : ''
            }`}
            aria-hidden="true"
          />
          {statusText}
        </p>

        <div
          className="progress-bar"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="演算总进度"
        >
          <div className="progress-bar__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        <div className="session__summary">{inputSummary}</div>
      </div>

      <div className="session__stage">
        <div className="session__palm">
          <PalmDiagram
            activeIndex={activePalaceIndex}
            startIndex={stepStartIndex}
            resultIndex={stepResultIndex}
            visitedIndices={visitedIndices}
            countBadge={currentOrdinal}
            landedMarksByIndex={landedMarksByIndex}
            showPointer={activePalaceIndex !== null && !isReady}
            landed={landed}
            pulseSeq={landingSeq}
            reducedMotion={reducedMotion}
            variant="session"
            palaceMeta={SIX_PALACE_META}
            cells={SIX_CELL_LAYOUT}
          />
        </div>

        <div className="session__float card card--raised" role="group" aria-label="演算控制">
          <div className="session__readout">
            <span className="session__counter">
              <span className="session__counter-ordinal mono-num" data-testid="six-counter-ordinal">
                第 {currentOrdinal} 位
              </span>
              <span className="session__counter-total mono-num faint">共 {pathsLength} 位</span>
            </span>
            <span className="session__now">
              <span className="session__now-label">所在宫位</span>
              <span className="session__now-name" data-testid="six-current-palace">
                {activeMeta ? activeMeta.name : '—'}
              </span>
              <span className="badge">{activeMeta ? `第 ${activeMeta.order} 位` : '—'}</span>
            </span>
            {isStepComplete && resultMeta ? (
              <span className="session__landed" data-testid="six-step-landed">
                <span className="badge badge--gold">本步落宫</span>
                <strong className="session__landed-name">{resultMeta.name}</strong>
                <span className="faint session__landed-brief">{resultMeta.brief}</span>
              </span>
            ) : null}
            {activeMeta ? (
              <p className="session__brief muted">
                {activeMeta.brief}　·　{activeMeta.guardian}（{activeMeta.guardianNote}）
              </p>
            ) : null}
          </div>

          <div className="session__actions">
            <button
              type="button"
              className="btn btn--sm"
              onClick={isPaused ? actions.resume : actions.pause}
              disabled={!isAnimating && !isPaused}
              data-testid="six-btn-pause-resume"
            >
              {isPaused ? '继续' : '暂停'}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={actions.prevStep}
              disabled={!canGoPrev}
              data-testid="six-btn-prev-step"
            >
              上一步
            </button>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={canSeeResult ? actions.finish : actions.nextStep}
              disabled={!canGoNext && !canSeeResult}
              data-testid="six-btn-next-step"
            >
              {canSeeResult ? '查看结果' : '下一步'}
            </button>
          </div>

          <div className="session__tools">
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={actions.skipAll}
              data-testid="six-btn-skip"
              aria-label="跳过动画"
            >
              <span className="label-full">跳过动画</span>
              <span className="label-mini">跳过</span>
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={actions.restart}
              data-testid="six-btn-restart"
              aria-label="重新演算"
            >
              <span className="label-full">重新演算</span>
              <span className="label-mini">重算</span>
            </button>
            {showBackToInput ? (
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={onBackToInput}
                aria-label="返回修改输入"
              >
                <span className="label-full">返回修改</span>
                <span className="label-mini">返回</span>
              </button>
            ) : null}
            <button
              type="button"
              className="session__chip mono-num"
              onClick={() => actions.setSpeed(nextSpeed(speed))}
              data-testid="six-btn-speed-toggle"
              aria-label={`动画速度 ${speed} 倍，点击切换`}
            >
              {speed}×
            </button>
            <button
              type="button"
              className="session__chip"
              onClick={() => actions.setAutoContinue(!autoContinue)}
              data-testid="six-btn-mode-toggle"
              aria-label={`步进方式：${autoContinue ? '自动继续' : '手动逐步'}，点击切换`}
              aria-pressed={autoContinue}
            >
              <span className="label-full">{autoContinue ? '自动继续' : '手动逐步'}</span>
              <span className="label-mini">{autoContinue ? '自动' : '手动'}</span>
            </button>
          </div>

          <p className="faint session__hint">
            跳过动画只跳过展示，不会改变本次输入与结果。六宫循环为 大安 → 留连 → 速喜 → 赤口 → 小吉 → 空亡。
          </p>
        </div>
      </div>
    </section>
  );
}
