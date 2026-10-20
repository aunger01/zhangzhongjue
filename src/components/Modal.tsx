/**
 * 轻量弹层：遮罩 + 对话框，支持 Esc 关闭与点击遮罩关闭，并锁定页面滚动。
 */

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
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
