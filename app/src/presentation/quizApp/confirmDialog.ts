/**
 * カスタム確認ダイアログ表示ヘルパー。
 *
 * `quizApp.ts` から切り出された純粋な DOM 操作関数。
 * QuizApp の状態には依存せず、DOM 要素 ID のみで動作する。
 */

/**
 * カスタム確認ダイアログを表示し、ユーザーの選択を Promise で返す。
 * 必要な DOM 要素が存在しない場合は `window.confirm` / `window.alert` にフォールバックする。
 *
 * @param message    ダイアログに表示するメッセージ
 * @param alertOnly  true の場合、キャンセルボタンを隠して通知のみとして表示する
 */
export function showConfirmDialog(message: string, alertOnly = false): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmDialog");
    const msgEl = document.getElementById("confirmDialogMessage");
    const okBtn = document.getElementById("confirmDialogOk") as HTMLButtonElement | null;
    const cancelBtn = document.getElementById("confirmDialogCancel") as HTMLButtonElement | null;
    if (!overlay || !msgEl || !okBtn || !cancelBtn) {
      if (alertOnly) {
        alert(message);
        resolve(true);
      } else {
        resolve(window.confirm(message));
      }
      return;
    }
    msgEl.textContent = message;
    overlay.classList.remove("hidden");
    if (alertOnly) {
      cancelBtn.classList.add("hidden");
    } else {
      cancelBtn.classList.remove("hidden");
    }

    const previousFocus = document.activeElement as HTMLElement | null;

    const close = (result: boolean): void => {
      overlay.classList.add("hidden");
      cancelBtn.classList.remove("hidden");
      okBtn.removeEventListener("click", onOk);
      cancelBtn.removeEventListener("click", onCancel);
      overlay.removeEventListener("keydown", onKeydown);
      previousFocus?.focus();
      resolve(result);
    };
    const onOk = (): void => close(true);
    const onCancel = (): void => close(false);
    const onKeydown = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        close(alertOnly ? true : false);
      }
      // フォーカストラップ: Tabキーをダイアログ内のボタンに限定する
      if (e.key === "Tab") {
        e.preventDefault();
        if (alertOnly) {
          // アラートモードではOKボタンのみ。Tabキーを押してもOKボタンにフォーカスを維持する
          okBtn.focus();
        } else if (e.shiftKey) {
          // Shift+Tab: 逆方向にフォーカス移動
          if (document.activeElement === cancelBtn) {
            okBtn.focus();
          } else {
            cancelBtn.focus();
          }
        } else if (document.activeElement === okBtn) {
          cancelBtn.focus();
        } else {
          okBtn.focus();
        }
      }
    };
    okBtn.addEventListener("click", onOk);
    cancelBtn.addEventListener("click", onCancel);
    overlay.addEventListener("keydown", onKeydown);

    okBtn.focus();
  });
}
