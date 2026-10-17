/**
 * 掌中诀 · 应用外壳
 *
 * 负责视图切换与"演算会话"的编排：
 *   HOME → INPUT（生辰 / 文字）→ READY → ANIMATING ⇄ PAUSED
 *                                       → STEP_COMPLETE → FINAL_RESULT（结果页）
 *
 * 提交输入后直接进入掐指演算（原「起数预览」步骤已取消，流程更顺畅）。
 * 演算开始后本次结果对象被冻结，所有控件只改变"观看方式"。
 */

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { SessionView } from './components/SessionView';
import { ResultPage } from './components/ResultPage';
import { GuideModal } from './components/GuideModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import type { BirthSubmission } from './features/birth/BirthForm';
import { TextForm, type TextSubmission } from './features/text/TextForm';
import { SHICHEN } from './features/birth/timeMapping';
import { createDivinationResult } from './features/divination/calculate';
import { PALACES } from './features/divination/palaceConstants';
import { useDivinationMachine } from './features/divination/useDivinationMachine';
import { composeInterpretation } from './features/interpretation/composeResult';
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion';
import { soundEngine } from './features/audio/soundEngine';
import {
  appendHistory,
  clearHistory,
  createHistoryId,
  loadHistory,
  removeHistory,
  type HistoryEntry,
} from './features/history/historyStorage';
import type { CalendarInfo, DivinationMode, TextNumberingDetail } from './features/divination/types';
import './App.css';

type View = 'home' | 'birth' | 'text' | 'session' | 'result';

/**
 * 生辰起卦需要历法库，体量较大：按需加载，让首页与心念起卦保持轻量。
 */
const BirthForm = lazy(() =>
  import('./features/birth/BirthForm').then((module) => ({ default: module.BirthForm })),
);

interface PendingInput {
  mode: DivinationMode;
  month: number;
  day: number;
  hour: number;
  calendar?: CalendarInfo;
  detail?: TextNumberingDetail;
}

export default function App() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const machine = useDivinationMachine({ reducedMotion: prefersReducedMotion });
  const { state: machineState, actions } = machine;

  const [view, setView] = useState<View>('home');
  const [pending, setPending] = useState<PendingInput | null>(null);
  const [guide, setGuide] = useState<{ open: boolean; variant: 'play' | 'rules' }>({
    open: false,
    variant: 'play',
  });
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  /* ---------- 系统级动效偏好同步到 <html>，供 CSS 与状态机共用 ---------- */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motion = prefersReducedMotion ? 'reduced' : 'normal';
  }, [prefersReducedMotion]);

  /* ---------- 历史记录初始化（仅本地） ---------- */
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const result = machineState.result;

  /* ---------- 进入结果页：切换视图并记录一条本地历史 ---------- */
  const recordedRef = useRef<number | null>(null);
  useEffect(() => {
    if (machineState.phase !== 'FINAL_RESULT' || !result || !pending) return;
    setView('result');
    if (recordedRef.current === result.createdAt) return;
    recordedRef.current = result.createdAt;
    soundEngine.play('complete');
    const entry: HistoryEntry = {
      id: createHistoryId(result.createdAt),
      createdAt: result.createdAt,
      mode: pending.mode,
      inputSummary: buildInputSummary(pending, result.steps[0].inputNumber, result.steps[1].inputNumber, result.steps[2].inputNumber),
      numbersText: `${result.input.month}、${result.input.day}、${result.input.hour}`,
      palaces: [
        PALACES[result.steps[0].resultIndex],
        PALACES[result.steps[1].resultIndex],
        PALACES[result.steps[2].resultIndex],
      ],
      algorithmId: result.input.algorithmId,
      algorithmVersion: result.input.algorithmVersion,
    };
    setHistory(appendHistory(entry));
  }, [machineState.phase, result, pending]);

  /* ---------- 输入提交：直接进入掐指演算（不再经「起数预览」页） ---------- */
  const handleBirthSubmit = useCallback(
    (submission: BirthSubmission) => {
      const created = createDivinationResult({
        mode: 'birth',
        month: submission.month,
        day: submission.day,
        hour: submission.hour,
      });
      setPending({ ...submission });
      actions.load(created);
      actions.begin();
      setView('session');
    },
    [actions],
  );

  const handleTextSubmit = useCallback(
    (submission: TextSubmission) => {
      const created = createDivinationResult({
        mode: 'text',
        month: submission.month,
        day: submission.day,
        hour: submission.hour,
      });
      setPending({ ...submission });
      actions.load(created);
      actions.begin();
      setView('session');
    },
    [actions],
  );

  /* ---------- 导航 ---------- */
  const busy =
    machineState.phase === 'READY' ||
    machineState.phase === 'ANIMATING' ||
    machineState.phase === 'PAUSED' ||
    machineState.phase === 'STEP_COMPLETE';

  const goHome = useCallback(() => {
    if (busy && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      if (!window.confirm('演算进行中，返回首页将清空当前进度，确定返回吗？')) return;
    }
    actions.clear();
    setPending(null);
    setView('home');
  }, [busy, actions]);

  const interpretation = useMemo(() => {
    if (!result || !pending) return null;
    const numbersText = `${result.input.month}、${result.input.day}、${result.input.hour}`;
    return composeInterpretation(result, {
      mode: pending.mode,
      inputSummary: buildInputSummary(
        pending,
        result.input.month,
        result.input.day,
        result.input.hour,
      ),
      numbersText,
      methodNote:
        pending.mode === 'text'
          ? `文字心念取数法：A=${pending.detail?.count ?? 0}，B=${pending.detail?.codePointSum ?? 0}，C=${
              pending.detail?.codePointSquareSum ?? 0
            }`
          : undefined,
    });
  }, [result, pending]);

  const inputSummaryText = pending
    ? buildInputSummary(pending, pending.month, pending.day, pending.hour)
    : '';

  return (
    <div className={`app${view === 'result' ? ' app--docked' : ''}`}>
      <Navbar
        onHome={goHome}
        onOpenPlayGuide={() => setGuide({ open: true, variant: 'play' })}
        onOpenRules={() => setGuide({ open: true, variant: 'rules' })}
        onOpenHistory={() => setHistoryOpen(true)}
        historyCount={history.length}
        busy={busy}
      />

      <main className="app__main">
        {view === 'home' ? (
          <HomeView
            onSelectBirth={() => setView('birth')}
            onSelectText={() => setView('text')}
            reducedMotion={prefersReducedMotion}
          />
        ) : null}

        {view === 'birth' ? (
          <div className="container app__form-view">
            <Suspense fallback={<p className="notice">正在加载历法换算模块……</p>}>
              <BirthForm onSubmit={handleBirthSubmit} onCancel={() => setView('home')} />
            </Suspense>
          </div>
        ) : null}

        {view === 'text' ? (
          <div className="container app__form-view">
            <TextForm onSubmit={handleTextSubmit} onCancel={() => setView('home')} />
          </div>
        ) : null}

        {view === 'session' && result && pending ? (
          <SessionView
            result={result}
            machine={machine}
            reducedMotion={prefersReducedMotion}
            inputSummary={
              <>
                <span className="badge badge--gold">{pending.mode === 'birth' ? '生辰起卦' : '文字心念起卦'}</span>{' '}
                {inputSummaryText}
                <span className="faint"> ｜ 起数 {result.input.month}、{result.input.day}、{result.input.hour}</span>
              </>
            }
            onBackToInput={() => setView(pending.mode === 'birth' ? 'birth' : 'text')}
          />
        ) : null}

        {view === 'result' && result && interpretation && pending ? (
          <ResultPage
            result={result}
            interpretation={interpretation}
            inputSummary={inputSummaryText}
            numbersText={`${result.input.month}、${result.input.day}、${result.input.hour}`}
            calendar={pending.calendar ?? null}
            textNote={
              pending.mode === 'text' && pending.detail
                ? `本站自定义文字取数法：A=${pending.detail.count}，B=${pending.detail.codePointSum}，C=${pending.detail.codePointSquareSum}，归一化到 1～${pending.detail.range}`
                : null
            }
            onReplay={() => {
              actions.restart();
              setView('session');
            }}
            onNewDivination={() => {
              actions.clear();
              setPending(null);
              setView('home');
            }}
          />
        ) : null}
      </main>

      <footer className="footer">
        <div className="container footer__inner">
          <p className="faint footer__note">
            {/*
             * 仓库地址已落定并核对：GitHub aunger01/zhangzhongjue（首版已推送）。
             * 若日后仓库改名或迁移，此处与 README 中的仓库链接需同步更新。
             */}
            <a
              className="footer__gh"
              href="https://github.com/aunger01/zhangzhongjue"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub 仓库"
              title="GitHub 仓库"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M12 .5A11.5 11.5 0 0 0 .5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-2.1c-3.2.7-3.88-1.4-3.88-1.4-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.58.23 2.75.12 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.13v3.16c0 .3.2.66.79.55A11.5 11.5 0 0 0 23.5 12A11.5 11.5 0 0 0 12 .5Z"
                />
              </svg>
            </a>
            {/* 娱乐免责已由结果页底部的合规说明承担，这里只放版权署名 */}
            © 2026 Aunger Page · 保留所有权利
          </p>
        </div>
      </footer>

      <GuideModal
        open={guide.open}
        variant={guide.variant}
        onClose={() => setGuide({ open: false, variant: guide.variant })}
      />

      <HistoryDrawer
        open={historyOpen}
        entries={history}
        onClose={() => setHistoryOpen(false)}
        onRemove={(id) => setHistory(removeHistory(id))}
        onClear={() => setHistory(clearHistory())}
      />
    </div>
  );
}

/** 生成输入摘要文本（文字模式不包含原文） */
function buildInputSummary(
  pending: PendingInput,
  month: number,
  day: number,
  hour: number,
): string {
  if (pending.mode === 'birth' && pending.calendar) {
    return `${pending.calendar.displayText}，${SHICHEN[hour - 1].name}`;
  }
  if (pending.mode === 'text') {
    const count = pending.detail?.count ?? 0;
    return `心念文字（有效汉字 ${count} 字）`;
  }
  return `起数 ${month}、${day}、${hour}`;
}
