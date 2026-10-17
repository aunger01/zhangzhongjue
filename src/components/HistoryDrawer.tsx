/**
 * 历史记录（可选模块）
 *
 * 明确告知保存在当前浏览器 localStorage；
 * 提供单条删除与一键清空；不保存心念原文，文字模式仅记录有效字数。
 */

import type { HistoryEntry } from '../features/history/historyStorage';
import { formatHistoryTime, isStorageAvailable } from '../features/history/historyStorage';
import { Modal } from './Modal';
import './HistoryDrawer.css';

export interface HistoryDrawerProps {
  open: boolean;
  entries: HistoryEntry[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}

export function HistoryDrawer({ open, entries, onClose, onRemove, onClear }: HistoryDrawerProps) {
  const available = isStorageAvailable();

  return (
    <Modal open={open} title="历史记录（本地保存）" onClose={onClose}>
      <p className="notice">
        历史记录仅保存在当前浏览器的 localStorage 中，不会上传；你可以随时删除单条记录或一键清空。
        心念文字原文不会被保存，文字模式只记录有效字数。
      </p>

      {!available ? (
        <p className="notice notice--warn" style={{ marginTop: 12 }}>
          当前浏览器环境禁用了本地存储（例如隐私模式），历史记录将不可用，但占测功能不受影响。
        </p>
      ) : null}

      {entries.length === 0 ? (
        <p className="faint" style={{ marginTop: 14 }}>
          暂无历史记录。
        </p>
      ) : (
        <>
          <div className="history__head spread">
            <span className="faint">共 {entries.length} 条（最多保留 30 条）</span>
            <button type="button" className="btn btn--sm btn--danger" onClick={onClear} data-testid="history-clear">
              清空全部
            </button>
          </div>
          <ul className="history__list">
            {entries.map((entry) => (
              <li key={entry.id} className="history__item">
                <div className="history__main">
                  <span className="badge badge--gold">
                    {entry.palaces[0]} · {entry.palaces[1]} · {entry.palaces[2]}
                  </span>
                  <span className="history__summary">{entry.inputSummary}</span>
                  <span className="faint">
                    {entry.mode === 'birth' ? '生辰起卦' : '文字心念起卦'} ｜ 起数 {entry.numbersText} ｜{' '}
                    {formatHistoryTime(entry.createdAt)}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => onRemove(entry.id)}
                  aria-label={`删除 ${formatHistoryTime(entry.createdAt)} 的记录`}
                >
                  删除
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Modal>
  );
}
