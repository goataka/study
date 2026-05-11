/**
 * 履歴一覧タブ（`#historyList`）のコンテンツを保持するストア。
 * `renderHistoryList` から `set()` を呼んで更新し、`QuizPanel` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const historyListContentStore = createNodeStore();
