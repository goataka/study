/**
 * `overallSummaryPanel` / `progressDetailPanel` の表示状態を管理するストア。
 *
 * 旧実装では `document.getElementById("overallSummaryPanel")?.classList.add/remove("hidden")`
 * の DOM 操作で表示制御を行っていた。本ストアへの移行により、React コンポーネントが
 * `useSyncExternalStore` で購読して宣言的に `hidden` を制御できるようになる。
 *
 * `quizPanelVisibility.ts` からストアを更新し、`OverallSummaryPanel.tsx` /
 * `ProgressDetailPanel.tsx` がストアを購読することで、React 側で表示制御が完結する。
 *
 * 後方互換: ストア更新後も `classList` 操作は副作用として継続するため、
 * React 未マウントのテスト構成でも動作する。
 */

type PanelVisibilityState = {
  overallSummaryPanel: boolean;
  progressDetailPanel: boolean;
};

let state: PanelVisibilityState = {
  overallSummaryPanel: true, // 初期状態は非表示
  progressDetailPanel: true, // 初期状態は非表示
};

const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribePanelVisibility(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPanelVisibilitySnapshot(): PanelVisibilityState {
  return state;
}

/** `overallSummaryPanel` の表示状態を設定する。 */
export function setOverallSummaryPanelHidden(hidden: boolean): void {
  if (state.overallSummaryPanel === hidden) return;
  state = { ...state, overallSummaryPanel: hidden };
  notify();
}

/** `progressDetailPanel` の表示状態を設定する。 */
export function setProgressDetailPanelHidden(hidden: boolean): void {
  if (state.progressDetailPanel === hidden) return;
  state = { ...state, progressDetailPanel: hidden };
  notify();
}
