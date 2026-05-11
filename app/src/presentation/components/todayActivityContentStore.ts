/**
 * 総合タブ「今日の活動」セクション（`#todayActivityContent`）のコンテンツを保持するストア。
 * `renderTodayActivity` から `set()` を呼んで更新し、`OverallSummaryPanel` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const todayActivityContentStore = createNodeStore();
