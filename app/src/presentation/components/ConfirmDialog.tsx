/**
 * 確認ダイアログ（モーダル）を完全に React で制御するコンポーネント。
 *
 * 表示状態・本文・alertOnly フラグはすべて `confirmDialogStore` の外部ストアに
 * 集約され、本コンポーネントは `useSyncExternalStore` で購読する。
 * 命令的な `getElementById` / `addEventListener` / `classList.add` は使用しない。
 *
 * 互換性:
 * - DOM ID（`confirmDialog` / `confirmDialogMessage` / `confirmDialogOk` /
 *   `confirmDialogCancel`）は既存の単体テストとセレクタ互換のため維持する。
 * - `#confirmDialog` の `hidden` クラスはストア状態に応じて React が付与する。
 *
 * 振る舞い:
 * - open になった瞬間に OK ボタンへフォーカスを移し、閉じた直後に直前の
 *   フォーカスを復元する。
 * - Esc で閉じる（alertOnly のときは true、それ以外は false で解決）。
 * - Tab はダイアログ内（OK ↔ キャンセル）でループするフォーカストラップ。
 *   alertOnly のときは OK のみで閉じる。
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import { getSnapshot, resolveConfirmDialog, subscribe, type ConfirmDialogState } from "./confirmDialogStore";

export function ConfirmDialog(): React.JSX.Element {
  const state: ConfirmDialogState = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const okRef = useRef<HTMLButtonElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // open になったら OK ボタンへフォーカス、閉じたら以前のフォーカスを復元
  useEffect(() => {
    if (state.open) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      okRef.current?.focus();
    } else {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [state.open]);

  const handleOk = (): void => resolveConfirmDialog(true);
  const handleCancel = (): void => resolveConfirmDialog(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!state.open) return;
    if (e.key === "Escape") {
      e.preventDefault();
      resolveConfirmDialog(state.alertOnly ? true : false);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const ok = okRef.current;
      const cancel = cancelRef.current;
      if (state.alertOnly) {
        ok?.focus();
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === cancel) {
          ok?.focus();
        } else {
          cancel?.focus();
        }
      } else if (document.activeElement === ok) {
        cancel?.focus();
      } else {
        ok?.focus();
      }
    }
  };

  const overlayClass = state.open ? "confirm-dialog-overlay" : "confirm-dialog-overlay hidden";
  const cancelClass = state.alertOnly ? "secondary-btn hidden" : "secondary-btn";

  return (
    <div
      id="confirmDialog"
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmDialogMessage"
      onKeyDown={handleKeyDown}
    >
      <div className="confirm-dialog">
        <p id="confirmDialogMessage" className="confirm-dialog-message">
          {state.message}
        </p>
        <div className="confirm-dialog-buttons">
          <button ref={okRef} id="confirmDialogOk" className="primary-btn" type="button" onClick={handleOk}>
            OK
          </button>
          <button ref={cancelRef} id="confirmDialogCancel" className={cancelClass} type="button" onClick={handleCancel}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
