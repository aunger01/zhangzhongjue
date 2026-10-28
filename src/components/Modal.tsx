/**
 * 轻量弹层：遮罩 + 对话框，支持 Esc 关闭与点击遮罩关闭，并锁定页面滚动。
 * 无障碍：打开即聚焦对话框；Tab / Shift+Tab 在对话框内循环（焦点陷阱）；
 * 关闭（Esc / 遮罩 / 关闭钮）后把焦点归还给打开前的触发元素。
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** 对话框内可聚焦元素（排除 tabindex="-1" 的容器自身） */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

export function Modal({ open, title, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  // 仅随 open 变化记录触发元素，避免 onClose 引用变化时误把焦点目标改写成对话框自身
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    dialog?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const current = dialogRef.current;
      if (!current) return;
      const focusables = Array.from(current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && current.contains(active);

      if (focusables.length === 0) {
        // 对话框内没有任何可聚焦元素：把焦点钉在对话框上
        event.preventDefault();
        current.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey) {
        if (!inside || active === first || active === current) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      const toRestore = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (toRestore && document.contains(toRestore)) toRestore.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={dialogRef}
        data-testid="modal"
      >
        <div className="spread modal__head">
          <h2 className="card__title">{title}</h2>
          <button type="button" className="btn btn--sm btn--ghost" onClick={onClose} aria-label="关闭">
            关闭
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
