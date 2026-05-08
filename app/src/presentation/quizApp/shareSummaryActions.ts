/**
 * 共有サマリのクリップボードコピーヘルパー。
 *
 * `#shareSummaryText` のテキストを取得して `navigator.clipboard` に書き込み、
 * 失敗時は `fallbackCopy` に退避する。コピー完了後、`#copySummaryBtn` のラベルを一時的に変更する。
 */

import { fallbackCopy } from "../uiHelpers";

/**
 * 共有サマリテキストをクリップボードへコピーし、ボタンに完了表示を出す。
 */
export function copyShareSummary(): void {
  const el = document.getElementById("shareSummaryText");
  const text = el?.textContent ?? "";
  if (!text) return;

  const btn = document.getElementById("copySummaryBtn") as HTMLButtonElement | null;
  const originalText = btn?.textContent ?? "";
  const markCopied = (): void => {
    if (btn) {
      btn.textContent = "✅ コピーしました";
      setTimeout(() => {
        btn.textContent = originalText;
      }, 1500);
    }
  };

  if (navigator.clipboard) {
    void navigator.clipboard
      .writeText(text)
      .then(markCopied)
      .catch(() => {
        fallbackCopy(text);
        markCopied();
      });
  } else {
    fallbackCopy(text);
    markCopied();
  }
}
