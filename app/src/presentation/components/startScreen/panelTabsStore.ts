/**
 * パネルタブ群（クイズパネル / 総合サマリパネル / 進度詳細パネル）の
 * アクティブ状態を一元管理する外部ストア。
 *
 * - `useSyncExternalStore` 用の subscribe / getSnapshot を公開する
 * - 各タブグループ用の setter を公開する
 * - 副作用（履歴ロード・URL 同期等）のための専用 subscribe を別途提供する
 *
 * これにより、`showPanelTab` / `showOverallPanel` といった `classList` 直接操作の
 * 命令的 API を撤廃し、React コンポーネントが宣言的に active 状態を反映できる。
 */

/** インナーパネルタブの ID（クイズ／解説／履歴／問題一覧）。 */
export type PanelTab = "quiz" | "guide" | "history" | "questions";

/** 総合サマリパネルのタブ（学習状況 / シェア）。 */
export type OverallPanelTab = "learned" | "share";

/** 進度詳細パネルのモード（学年別 / カテゴリ別 / マトリクス）。 */
export type ProgressDetailMode = "grade" | "category" | "matrix";

interface PanelTabsState {
  activePanelTab: PanelTab;
  activeOverallPanel: OverallPanelTab;
  activeProgressDetailMode: ProgressDetailMode;
  /** `hidden` クラスを付与する panel-tab ID の集合（quizPanelVisibility が制御）。 */
  hiddenPanelTabs: ReadonlySet<PanelTab>;
}

const INITIAL_STATE: PanelTabsState = {
  activePanelTab: "quiz",
  activeOverallPanel: "learned",
  activeProgressDetailMode: "grade",
  hiddenPanelTabs: new Set<PanelTab>(),
};

let state: PanelTabsState = { ...INITIAL_STATE };

const reactListeners = new Set<() => void>();
const panelTabSideEffects = new Set<(tab: PanelTab) => void>();
const overallPanelSideEffects = new Set<(panel: OverallPanelTab) => void>();
const progressDetailSideEffects = new Set<(mode: ProgressDetailMode) => void>();

function notifyReact(): void {
  reactListeners.forEach((l) => l());
}

/** `useSyncExternalStore` 用 subscribe。React 再レンダリング用の listener を登録する。 */
export function subscribePanelTabsStore(listener: () => void): () => void {
  reactListeners.add(listener);
  return () => {
    reactListeners.delete(listener);
  };
}

/** `useSyncExternalStore` 用 getSnapshot。 */
export function getPanelTabsSnapshot(): PanelTabsState {
  return state;
}

/** インナーパネルタブを切り替える。 */
export function setActivePanelTab(tab: PanelTab): void {
  if (state.activePanelTab === tab) return;
  state = { ...state, activePanelTab: tab };
  notifyReact();
  panelTabSideEffects.forEach((cb) => cb(tab));
}

/** 総合サマリパネルのタブを切り替える。 */
export function setActiveOverallPanel(panel: OverallPanelTab): void {
  if (state.activeOverallPanel === panel) return;
  state = { ...state, activeOverallPanel: panel };
  notifyReact();
  overallPanelSideEffects.forEach((cb) => cb(panel));
}

/** 進度詳細パネルのモードを切り替える。 */
export function setActiveProgressDetailMode(mode: ProgressDetailMode): void {
  if (state.activeProgressDetailMode === mode) return;
  state = { ...state, activeProgressDetailMode: mode };
  notifyReact();
  progressDetailSideEffects.forEach((cb) => cb(mode));
}

/**
 * `hidden` クラスを付与する panel-tab ID の集合を更新する。
 * `quizPanelVisibility` が「単元未選択時はクイズ/問題/履歴タブを隠す」等の表示制御から呼ぶ。
 * 集合の中身が変化していない場合は notify しない。
 */
export function setHiddenPanelTabs(hidden: Iterable<PanelTab>): void {
  const next = new Set<PanelTab>(hidden);
  if (next.size === state.hiddenPanelTabs.size && [...next].every((t) => state.hiddenPanelTabs.has(t))) {
    return;
  }
  state = { ...state, hiddenPanelTabs: next };
  notifyReact();
}

/**
 * インナーパネルタブの選択時に発火する副作用 listener を登録する。
 * 戻り値は解除関数。
 */
export function subscribePanelTabSideEffect(cb: (tab: PanelTab) => void): () => void {
  panelTabSideEffects.add(cb);
  return () => {
    panelTabSideEffects.delete(cb);
  };
}

/** 総合サマリパネル切り替え時の副作用 listener を登録する。 */
export function subscribeOverallPanelSideEffect(cb: (panel: OverallPanelTab) => void): () => void {
  overallPanelSideEffects.add(cb);
  return () => {
    overallPanelSideEffects.delete(cb);
  };
}

/** 進度詳細モード切り替え時の副作用 listener を登録する。 */
export function subscribeProgressDetailSideEffect(cb: (mode: ProgressDetailMode) => void): () => void {
  progressDetailSideEffects.add(cb);
  return () => {
    progressDetailSideEffects.delete(cb);
  };
}

/** テスト用: ストアの状態と listener を初期化する。 */
export function __resetPanelTabsStoreForTests(): void {
  state = { ...INITIAL_STATE };
  reactListeners.clear();
  panelTabSideEffects.clear();
  overallPanelSideEffects.clear();
  progressDetailSideEffects.clear();
}
