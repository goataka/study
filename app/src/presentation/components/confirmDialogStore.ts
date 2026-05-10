/**
 * 確認ダイアログ用の外部ストア。
 *
 * 命令的 API `showConfirmDialog(message, alertOnly): Promise<boolean>` を
 * React の `<ConfirmDialog>`（`useSyncExternalStore` で購読）と橋渡しするための
 * 最小限のストア。`getElementById` / `addEventListener` / `classList` といった
 * 直接的な DOM 操作を排除し、表示状態と解決値をすべて React 側に委譲する。
 *
 * フォールバック契約:
 * - `<ConfirmDialog>` が React ツリー上に存在する（= subscriber が 1 件以上ある）
 *   ときに限り、ストアは「open 状態」を持ち、Promise はボタン操作で解決する。
 * - subscriber が 0 件のとき（= 古い静的 HTML だけが残っているケースや、何も
 *   描画されていないケース）は `window.confirm` / `window.alert` にフォールバック
 *   する。これにより既存の「DOM 要素がない場合は window.confirm にフォールバック
 *   する」仕様（quizApp.quizPanel/confirmDialog.test.ts）と互換が保たれる。
 */

export interface ConfirmDialogState {
  /** ダイアログが開いているかどうか。React は className でこれを反映する。 */
  open: boolean;
  /** ダイアログ本文。`<p id="confirmDialogMessage">` に表示される。 */
  message: string;
  /** true のときは「キャンセル」ボタンを隠し、通知のみとして扱う。 */
  alertOnly: boolean;
}

const CLOSED_STATE: ConfirmDialogState = {
  open: false,
  message: "",
  alertOnly: false,
};

type Listener = () => void;

const listeners = new Set<Listener>();
let state: ConfirmDialogState = CLOSED_STATE;
let pendingResolve: ((result: boolean) => void) | null = null;

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * useSyncExternalStore 用 subscribe 関数。
 * React `<ConfirmDialog>` のマウント期間中だけ呼ばれ、unsubscribe で解除する。
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** useSyncExternalStore 用 getSnapshot 関数。 */
export function getSnapshot(): ConfirmDialogState {
  return state;
}

/** テスト用の現在 subscriber 数取得。 */
export function getSubscriberCount(): number {
  return listeners.size;
}

/**
 * ダイアログを開いてユーザーの選択を Promise で返す。
 * - DOM 上に `#confirmDialog`（= `<ConfirmDialog>` がレンダリングしたモーダル）が
 *   存在しないなら `window.confirm`/`window.alert` にフォールバックする。
 *   元の Vanilla 実装と同じセマンティクス。
 * - 既に open 中の場合は前の Promise を `false`（alertOnly なら `true`）で
 *   解決して新しいダイアログに置き換える（多重 open による状態漏れ防止）。
 */
export function openConfirmDialog(message: string, alertOnly = false): Promise<boolean> {
  if (listeners.size === 0 || !document.getElementById("confirmDialog")) {
    if (alertOnly) {
      alert(message);
      return Promise.resolve(true);
    }
    return Promise.resolve(window.confirm(message));
  }
  // 既存の未解決ダイアログがあれば解決して上書きする
  if (pendingResolve) {
    const previousResolve = pendingResolve;
    pendingResolve = null;
    previousResolve(state.alertOnly ? true : false);
  }
  return new Promise<boolean>((resolve) => {
    pendingResolve = resolve;
    state = { open: true, message, alertOnly };
    notify();
  });
}

/**
 * 現在開いているダイアログを `result` で解決して閉じる。
 * `<ConfirmDialog>` の onClick / onKeyDown ハンドラーから呼ばれる。
 */
export function resolveConfirmDialog(result: boolean): void {
  if (!pendingResolve) {
    if (state.open) {
      state = CLOSED_STATE;
      notify();
    }
    return;
  }
  const resolve = pendingResolve;
  pendingResolve = null;
  state = CLOSED_STATE;
  notify();
  resolve(result);
}

/** テスト用: ストアを完全リセット（pending Promise は解決せず破棄）。 */
export function __resetConfirmDialogStoreForTests(): void {
  pendingResolve = null;
  state = CLOSED_STATE;
  listeners.clear();
}
