/**
 * 顶部导航
 *
 * 宽屏：项目名 · 玩法说明 · 规则说明 · 历史记录 · 音效开关
 * 窄屏（≤760px）：项目名 · 音效开关 · 更多 —— 三个入口收进「更多」下拉菜单，
 * 避免导航栏挤占首页一屏空间。
 */

import { useEffect, useRef, useState } from 'react';
import { SoundToggle } from './SoundToggle';
import './Navbar.css';

export interface NavbarProps {
  onHome: () => void;
  onOpenPlayGuide: () => void;
  onOpenRules: () => void;
  onOpenHistory: () => void;
  historyCount: number;
  /** 是否正在演算中（演算中点击首页需确认，避免误触丢失进度） */
  busy: boolean;
}

export function Navbar({
  onHome,
  onOpenPlayGuide,
  onOpenRules,
  onOpenHistory,
  historyCount,
  busy,
}: NavbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement | null>(null);

  /* 点击面板外部或按 Esc 收起下拉菜单 */
  useEffect(() => {
    if (!moreOpen) return undefined;
    const handlePointerDown = (event: PointerEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [moreOpen]);

  const pick = (action: () => void) => () => {
    setMoreOpen(false);
    action();
  };

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <button
          type="button"
          className="navbar__brand"
          onClick={onHome}
          aria-label="返回首页"
          data-testid="nav-home"
        >
          <span className="navbar__mark" aria-hidden="true">
            诀
          </span>
          <span className="navbar__brand-text">
            <strong>掌中诀</strong>
            <em>九宫小六壬</em>
          </span>
        </button>

        <nav className="navbar__links" aria-label="主导航">
          {/* 宽屏横向入口；窄屏整体收进「更多」菜单 */}
          <div className="navbar__group">
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={onOpenPlayGuide}
              data-testid="nav-play"
            >
              玩法说明
            </button>
            <button type="button" className="btn btn--sm btn--ghost" onClick={onOpenRules} data-testid="nav-rules">
              规则说明
            </button>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={onOpenHistory}
              data-testid="nav-history"
            >
              历史记录
              {historyCount > 0 ? <span className="navbar__count mono-num">{historyCount}</span> : null}
            </button>
          </div>

          <SoundToggle />

          <div className="navbar__more" ref={moreRef}>
            <button
              type="button"
              className="btn btn--sm btn--ghost navbar__more-btn"
              onClick={() => setMoreOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              aria-controls="nav-more-menu"
              aria-label="更多功能"
              data-testid="nav-more"
            >
              <span>更多</span>
              <svg
                className={`navbar__more-caret${moreOpen ? ' is-open' : ''}`}
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
              >
                <path d="M1 3.2 5 7.2 9 3.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>

            {moreOpen ? (
              <div className="navbar__menu" id="nav-more-menu" role="menu" aria-label="更多功能">
                <button type="button" role="menuitem" onClick={pick(onOpenPlayGuide)} data-testid="nav-more-play">
                  玩法说明
                </button>
                <button type="button" role="menuitem" onClick={pick(onOpenRules)} data-testid="nav-more-rules">
                  规则说明
                </button>
                <button type="button" role="menuitem" onClick={pick(onOpenHistory)} data-testid="nav-more-history">
                  <span>历史记录</span>
                  {historyCount > 0 ? <span className="navbar__count mono-num">{historyCount}</span> : null}
                </button>
              </div>
            ) : null}
          </div>
        </nav>
      </div>
      {busy ? <span className="faint navbar__hint">演算进行中：返回首页会清空当前进度</span> : null}
    </header>
  );
}
