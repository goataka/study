/**
 * 「総合」タブのサマリパネルの描画オーケストレーター（純粋関数）。
 *
 * `overallSummaryPanel.ts` の各種描画ヘルパーをまとめて呼び出し、
 * 「学習状況」「今日の活動」「共有用テキスト」を一度に更新する。
 */

import type { QuizUseCase, QuizRecord } from "../../application/quizUseCase";
import {
  renderOverallSubjectStatus,
  updateActivityDateDisplay,
  showOverallPanel,
  renderTodayActivity,
} from "./overallSummaryPanel";
import { buildShareSummaryText } from "../shareSummary";

/**
 * 総合タブのサマリパネル全体を描画する。
 *
 * @param params.useCase                 クイズユースケース
 * @param params.subjectRecommendedCounts 教科ごとのおすすめ単元数
 * @param params.selectedActivityDate    活動表示の対象日付（YYYY-MM-DD）
 * @param params.activeOverallPanel      表示中のサブパネル種別
 * @param params.allRecords              事前ロード済みの履歴（省略時は useCase から取得）
 */
export function renderOverallSummaryPanel(params: {
  useCase: QuizUseCase;
  subjectRecommendedCounts: Map<string, number>;
  selectedActivityDate: string;
  activeOverallPanel: "learned" | "share";
  allRecords?: QuizRecord[];
}): void {
  const panel = document.getElementById("overallSummaryPanel");
  if (!panel) return;

  const records = params.allRecords ?? params.useCase.getHistory();
  updateActivityDateDisplay(params.useCase, params.selectedActivityDate);
  renderOverallSubjectStatus(params.useCase, params.subjectRecommendedCounts);
  renderTodayActivity(records, params.useCase, params.selectedActivityDate);
  updateShareSummaryText(params.useCase, records, params.selectedActivityDate);
  showOverallPanel(params.activeOverallPanel);
}

/**
 * SNS 共有用の活動サマリテキストを構築して `#shareSummaryText` 要素に反映する。
 */
export function updateShareSummaryText(
  useCase: QuizUseCase,
  records: QuizRecord[],
  selectedActivityDate: string,
): void {
  const el = document.getElementById("shareSummaryText");
  if (el) {
    el.textContent = buildShareSummaryText(records, selectedActivityDate, useCase);
  }
}
