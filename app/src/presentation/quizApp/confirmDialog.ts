/**
 * カスタム確認ダイアログ表示ヘルパー（薄いストアラッパー）。
 *
 * 旧版は `getElementById` / `addEventListener` / `classList` を直接操作する
 * Vanilla TypeScript の DOM コントローラだったが、React 移行に伴い
 * `confirmDialogStore` + React `<ConfirmDialog>` に責務を移譲した。
 *
 * 公開 API（`showConfirmDialog(message, alertOnly): Promise<boolean>`）は
 * 既存呼び出し元（QuizApp / 各 delegators / adminPanel / categoryListRouter / etc.）
 * との互換のためそのまま維持する。
 */

import { openConfirmDialog } from "../components/confirmDialogStore";

/**
 * カスタム確認ダイアログを表示し、ユーザーの選択を Promise で返す。
 * `<ConfirmDialog>` がマウントされていない場合は `window.confirm` /
 * `window.alert` にフォールバックする（ストア側で判定）。
 *
 * @param message    ダイアログに表示するメッセージ
 * @param alertOnly  true の場合、キャンセルボタンを隠して通知のみとして表示する
 */
export function showConfirmDialog(message: string, alertOnly = false): Promise<boolean> {
  return openConfirmDialog(message, alertOnly);
}
