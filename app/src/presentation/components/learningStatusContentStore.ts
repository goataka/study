/**
 * 学習状況パネル（開始するボタン＋星表示）の React コンテンツを保持するストア。
 *
 * overallStatusContentStore と同じパターンで、
 * `overallSummaryPanel.tsx` の `renderLearningStatusStars` から set され、
 * `OverallSummaryPanel.tsx` が購読して描画する。
 */

import { createNodeStore } from "./createNodeStore";

export const learningStatusContentStore = createNodeStore();
