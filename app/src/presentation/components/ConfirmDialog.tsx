/**
 * 確認ダイアログ（モーダル）。
 *
 * 表示・非表示の切り替えとメッセージ更新は `confirmDialog`（presentation/quizApp 配下）が
 * `hidden` クラスとテキスト操作で行う。
 */

export function ConfirmDialog(): React.JSX.Element {
  return (
    <div
      id="confirmDialog"
      className="confirm-dialog-overlay hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmDialogMessage"
    >
      <div className="confirm-dialog">
        <p id="confirmDialogMessage" className="confirm-dialog-message"></p>
        <div className="confirm-dialog-buttons">
          <button id="confirmDialogOk" className="primary-btn">
            OK
          </button>
          <button id="confirmDialogCancel" className="secondary-btn">
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
