/**
 * フォントサイズ状態の外部ストア。
 *
 * React 側は `useSyncExternalStore` で購読し、`App` が body クラスを反映する。
 * `syncFontSizeDom` は QuizApp 単体DOMテスト互換のために残している同期ヘルパー。
 */

export type FontSizeLevel = "small" | "medium" | "large";

type Listener = () => void;

let currentLevel: FontSizeLevel = "small";
const listeners = new Set<Listener>();

export function subscribeFontSizeStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFontSizeSnapshot(): FontSizeLevel {
  return currentLevel;
}

export function setFontSizeLevel(level: FontSizeLevel): void {
  if (currentLevel === level) return;
  currentLevel = level;
  listeners.forEach((listener) => listener());
}

export function syncFontSizeDom(level: FontSizeLevel): void {
  document.documentElement.style.fontSize = level === "large" ? "150%" : level === "medium" ? "120%" : "100%";
  document.body.classList.remove("font-size-medium", "font-size-large");
  if (level === "medium") document.body.classList.add("font-size-medium");
  if (level === "large") document.body.classList.add("font-size-large");

  document.querySelectorAll<HTMLButtonElement>(".font-size-btn").forEach((btn) => {
    const active = btn.dataset.size === level;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}
