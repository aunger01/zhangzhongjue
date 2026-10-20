/**
 * 掐指演算界面
 *
 * 结构：head（当前步骤 / 状态 / 进度）→ stage（掌位图 + 控制浮层）。
 * 控制浮层的定位由 CSS 切换：
 *   - 桌面端：session__stage 走 display:contents，浮层落入右栏（掌图右侧）；
 *   - 移动端：浮层绝对定位悬浮于掌心（掌体中段空白处），整页压缩为一屏。
 * 演算过程中不展示完整计数路径（避免提前剧透落宫），回看由结果页「查看计算过程」承担。
 * 所有展示数据都来自算法层返回的路径，控件只改变"播放方式"，不改变结果。
 */

import { useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { PalmDiagram } from './PalmDiagram';
import { getPalaceMeta } from '../features/divination/palaceConstants';
import { STEP_LABELS, STEP_TITLES, type DivinationResult } from '../features/divination/types';
import type { UseDivinationMachineResult } from '../features/divination/useDivinationMachine';
import { soundEngine } from '../features/audio/soundEngine';
import './SessionView.css';

export interface SessionViewProps {
  result: DivinationResult;
  machine: UseDivinationMachineResult;
  reducedMotion: boolean;
  /** 输入摘要（生辰或文字模式的说明文本） */
  inputSummary: ReactNode;
  /** 返回修改输入（仅在正式演算开始前可用） */
  onBackToInput: () => void;
}

/** 速度档位：点击循环 0.5× → 1× → 2× → 0.5×（默认 1×） */
const SPEED_OPTIONS = [0.5, 1, 2] as const;

function nextSpeed(current: number): number {
  const index = SPEED_OPTIONS.findIndex((option) => option === current);
  return SPEED_OPTIONS[(index + 1) % SPEED_OPTIONS.length];
}

export function SessionView({
  result,
  machine,
  reducedMotion,
  inputSummary,
  onBackToInput,
}: SessionViewProps) {
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

  /* ---------- 音效：点击 / 落宫（默认静音时无任何开销） ---------- */
  const prevCursor = useRef(cursor);
  useEffect(() => {
    if (isAnimating && cursor !== prevCursor.current) {
      soundEngine.play('click');
    }
    prevCursor.current = cursor;
  }, [cursor, isAnimating]);

  const prevLanding = useRef(landingSeq);
  useEffect(() => {
    if (landingSeq !== prevLanding.current && isStepComplete) {
      soundEngine.play('land');
    }
    prevLanding.current = landingSeq;
  }, [landingSeq, isStepComplete]);

  /* ---------- 派生展示数据 ---------- */
  const visitedIndices = useMemo(
    () => (currentStep ? currentStep.pathIndices.slice(0, cursor + 1) : []),
    [currentStep, cursor],
  );

  const landedMarksByIndex = useMemo(() => {
    const marks: Record<number, string[]> = {};
    result.steps.forEach((step, index) => {
      // 已完成的步骤：不包括当前正在推演的这一步（当前步用"落"标记单列）
      const finished = index < stepIndex || (index === stepIndex && isStepComplete);
      if (!finished) return;
      const label = STEP_LABELS[step.step];
      marks[step.resultIndex] = [...(marks[step.resultIndex] ?? []), label];
    });
    return marks;
  }, [result.steps, stepIndex, isStepComplete]);

  const landed = isStepComplete && stepResultIndex !== null;
  const activeMeta = activePalaceIndex !== null ? getPalaceMeta(activePalaceIndex) : null;
  const startMeta = stepStartIndex !== null ? getPalaceMeta(stepStartIndex) : null;
  const resultMeta = stepResultIndex !== null ? getPalaceMeta(stepResultIndex) : null;

  const statusText = (() => {
    if (isReady) return '手掌就位，即将开始掐指……';
    if (isAnimating) return '掐指推演中';
    if (isPaused) return '已暂停，可随时继续';
    if (isStepComplete) return `本步落宫：${resultMeta?.name ?? ''}`;
    return '';
  })();

  const canGoPrev = stepIndex > 0;
  const canGoNext = isStepComplete && !isLastStep;
  const canSeeResult = isStepComplete && isLastStep;
  const showBackToInput = isReady || isPaused;

  return (
    <section className="session container" aria-label="掐指演算">
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

        <p className="session__status" data-testid="session-status" aria-live="polite">
          <span
            className={`session__dot ${isAnimating ? 'session__dot--live breathe' : ''} ${
              isPaused ? 'session__dot--paused' : ''
            }`}
            aria-hidden="true"
          />
          {statusText}
        </p>

        <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="演算总进度">
          <div className="progress-bar__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>

        <div className="session__summary">{inputSummary}</div>
      </div>

      <div className="session__stage">
        {/*
         * 移动端的定位基准就是 session__stage：其高度与大等于掌位图本身，
         * 掌心百分比（56% / 62.5%）因此在任何屏宽下都落在同一处掌体空白区。
         */}
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
          />
        </div>

        {/* 控制浮层：桌面端落入右栏，移动端悬浮于掌心（同一份 DOM，位置由 CSS 切换） */}
        <div className="session__float card card--raised" role="group" aria-label="演算控制">
          <div className="session__readout">
            <span className="session__counter">
              <span className="session__counter-ordinal mono-num" data-testid="counter-ordinal">
                第 {currentOrdinal} 位
              </span>
              <span className="session__counter-total mono-num faint">共 {pathsLength} 位</span>
            </span>
            <span className="session__now">
              <span className="session__now-label">所在宫位</span>
              <span className="session__now-name" data-testid="current-palace">
                {activeMeta ? activeMeta.name : '—'}
              </span>
              <span className="badge">{activeMeta ? `第 ${activeMeta.order} 位` : '—'}</span>
            </span>
            {isStepComplete && resultMeta ? (
              <span className="session__landed" data-testid="step-landed">
                <span className="badge badge--gold">本步落宫</span>
                <strong className="session__landed-name">{resultMeta.name}</strong>
                <span className="faint session__landed-brief">{resultMeta.brief}</span>
              </span>
            ) : null}
            {activeMeta ? <p className="session__brief muted">{activeMeta.brief}</p> : null}
          </div>

          <div className="session__actions">
            <button
              type="button"
              className="btn btn--sm"
              onClick={isPaused ? actions.resume : actions.pause}
              disabled={!isAnimating && !isPaused}
              data-testid="btn-pause-resume"
            >
              {isPaused ? '继续' : '暂停'}
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={actions.prevStep}
              disabled={!canGoPrev}
              data-testid="btn-prev-step"
            >
              上一步
            </button>
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={canSeeResult ? actions.finish : actions.nextStep}
              disabled={!canGoNext && !canSeeResult}
              data-testid="btn-next-step"
            >
              {canSeeResult ? '查看结果' : '下一步'}
            </button>
          </div>

          {/* 次排：跳过 / 重算 /（返回）+ 速度 / 步进方式；与主排同宽等分 */}
          <div className="session__tools">
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={actions.skipAll}
              data-testid="btn-skip"
              aria-label="跳过动画"
            >
              <span className="label-full">跳过动画</span>
              <span className="label-mini">跳过</span>
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={actions.restart}
              data-testid="btn-restart"
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
              data-testid="btn-speed-toggle"
              aria-label={`动画速度 ${speed} 倍，点击切换`}
              title="点击切换动画速度（0.5× / 1× / 2×）"
            >
              {speed}×
            </button>
            <button
              type="button"
              className="session__chip"
              onClick={() => actions.setAutoContinue(!autoContinue)}
              data-testid="btn-mode-toggle"
              aria-label={`步进方式：${autoContinue ? '自动继续' : '手动逐步'}，点击切换`}
              title="点击切换步进方式"
              aria-pressed={autoContinue}
            >
              <span className="label-full">{autoContinue ? '自动继续' : '手动逐步'}</span>
              <span className="label-mini">{autoContinue ? '自动' : '手动'}</span>
            </button>
          </div>

          <p className="faint session__hint">
            跳过动画只跳过展示，不会改变本次输入与结果。完整计数过程可在演算结束后于结果页展开查看。
          </p>
        </div>
      </div>
    </section>
  );
}
