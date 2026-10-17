/**
 * 音效开关（图标按钮）
 *
 * 默认开启；关闭态在音符图标上叠加一条斜线（与常见 App 的静音图标同构）。
 * 仅显示图标、不占文字宽度；无障碍信息由 aria-label / aria-pressed / title 提供。
 */

import { useState } from 'react';
import { soundEngine } from '../features/audio/soundEngine';

export function SoundToggle() {
  const [enabled, setEnabled] = useState(soundEngine.isEnabled());

  const toggle = () => {
    const next = !enabled;
    soundEngine.setEnabled(next);
    setEnabled(next);
    if (next) {
      soundEngine.play('click');
    }
  };

  return (
    <button
      type="button"
      className={`btn btn--sm btn--ghost sound-toggle ${enabled ? 'is-on' : 'is-off'}`}
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? '关闭音效' : '开启音效'}
      title={enabled ? '关闭音效' : '开启音效'}
      data-testid="sound-toggle"
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {/* 双八分音符（App 通用音乐图标） */}
        <path d="M9 18V5l10-2v12" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="16.5" cy="15" r="2.5" />
        {/* 关闭态：叠加斜线 */}
        {enabled ? null : <line x1="3.2" y1="3.2" x2="20.8" y2="20.8" />}
      </svg>
    </button>
  );
}
