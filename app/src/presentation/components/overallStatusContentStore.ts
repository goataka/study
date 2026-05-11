/**
 * 総合タブ「教科別学習状況サマリ」（`#overallSubjectStatusSummary`）のコンテンツを保持するストア。
 * `renderOverallSubjectStatus` から `set()` を呼んで更新し、`OverallSummaryPanel` が購読して描画する。
 */
import { createNodeStore } from "./createNodeStore";
export const overallStatusContentStore = createNodeStore();
