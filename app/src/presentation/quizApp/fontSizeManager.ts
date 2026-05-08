/**
 * フォントサイズ管理ヘルパー。
 *
 * `document.body` のクラスとフォントサイズボタンの aria-pressed を更新する。
 * 永続化はリポジトリへの委譲で行う（呼び出し元の責務）。
 */

export type FontSizeLevel = "small" | "medium" | "large";

/**
 * フォントサイズを画面に適用する。
 * - body にサイズクラス (`font-size-medium` / `font-size-large`) を付与する
 * - フォントサイズボタンのアクティブ状態と `aria-pressed` を更新する
 *
 * @param level   適用するレベル
 * @param persist 永続化が必要な場合 true。`onPersist` が呼ばれる
 * @param onPersist 永続化を実行するコールバック（リポジトリ呼び出しなど）
 */
export function applyFontSizeToDom(
  level: FontSizeLevel,
  persist: boolean,
  onPersist: (level: FontSizeLevel) => void,
): void {
  document.body.classList.remove("font-size-medium", "font-size-large");
  if (level === "medium") {
    document.body.classList.add("font-size-medium");
  } else if (level === "large") {
    document.body.classList.add("font-size-large");
  }
  document.querySelectorAll<HTMLButtonElement>(".font-size-btn").forEach((btn) => {
    const active = btn.dataset.size === level;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
  if (persist) {
    onPersist(level);
  }
}
