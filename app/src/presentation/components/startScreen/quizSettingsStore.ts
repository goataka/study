/**
 * クイズ実行時のユーザー設定（問題数 / 並び順 / 学習済みを含むか）の React 共有ストア。
 *
 * 命令的 DOM 操作（`appSettingsService.loadQuizSettings` で `input.checked = true` を
 * 直接書き込む）と、React コンポーネント (`<QuizPanel>` のラジオボタン) の両者が
 * 同じ値を参照できるようにするための薄い外部ストア。
 *
 * - DOM 経由での変更（ユーザーがラジオをクリック）は `eventListeners.setupQuizSettingsListeners`
 *   が捕捉して `setQuizSettings` を呼ぶ
 * - 永続化からの復元（`loadQuizSettings`）も最終的に `setQuizSettings` を呼ぶ
 * - `<QuizPanel>` は `useQuizSettings()` で購読し、`checked` を宣言的に反映する
 *
 * ストアは「真の値」を持つが、DOM 上の `input.checked` も従来通り同期されているため
 * 後方互換のあるテスト（`querySelector('input[name="..."]:checked')`）は引き続き動作する。
 */

export interface QuizSettingsState {
  questionCount: number;
  quizOrder: "random" | "straight";
  /** 学習済み問題を含むか（include）／含まないか（exclude）。 */
  includeMastered: boolean;
}

const INITIAL_STATE: QuizSettingsState = {
  questionCount: 10,
  quizOrder: "random",
  includeMastered: false,
};

let state: QuizSettingsState = { ...INITIAL_STATE };
const reactListeners = new Set<() => void>();

function notify(): void {
  reactListeners.forEach((cb) => cb());
}

/** React 用 `useSyncExternalStore` の subscribe。 */
export function subscribeQuizSettingsStore(cb: () => void): () => void {
  reactListeners.add(cb);
  return () => reactListeners.delete(cb);
}

/** 現在の値スナップショット（参照同一性が保たれるため `useSyncExternalStore` で安全）。 */
export function getQuizSettingsSnapshot(): QuizSettingsState {
  return state;
}

/**
 * クイズ設定を更新する（部分更新可）。
 * 値が変化していない場合は `notify` をスキップする。
 */
export function setQuizSettings(updates: Partial<QuizSettingsState>): void {
  const next: QuizSettingsState = { ...state, ...updates };
  if (
    next.questionCount === state.questionCount &&
    next.quizOrder === state.quizOrder &&
    next.includeMastered === state.includeMastered
  ) {
    return;
  }
  state = next;
  notify();
}

/** テスト用にストアをリセットする。 */
export function __resetQuizSettingsStoreForTests(): void {
  state = { ...INITIAL_STATE };
  reactListeners.clear();
}
