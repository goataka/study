import type { QuizUseCase, QuizRecord } from "../../application/quizUseCase";
import {
  renderOverallSubjectStatus,
  updateActivityDateDisplay,
  showOverallPanel,
  renderTodayActivity,
  renderLearningStatusStars,
} from "./overallSummaryPanel";
import { buildShareSummaryText } from "../shareSummary";

/**
 * 総合タブのサマリパネル全体を描画する。
 *
 * @param params.useCase                 クイズユースケース
 * @param params.globalRecommendedCount  全教科共通のおすすめ単元目標数
 * @param params.selectedActivityDate    活動表示の対象日付（YYYY-MM-DD）
 * @param params.activeOverallPanel      表示中のサブパネル種別
 * @param params.allRecords              事前ロード済みの履歴（省略時は useCase から取得）
 */
export function renderOverallSummaryPanel(params: {
  useCase: QuizUseCase;
  globalRecommendedCount: number;
  selectedActivityDate: string;
  activeOverallPanel: "learned" | "share";
  allRecords?: QuizRecord[];
}): void {
  const panel = document.getElementById("overallSummaryPanel");
  if (!panel) return;

  const records = params.allRecords ?? params.useCase.getHistory();
  updateActivityDateDisplay(params.useCase, params.selectedActivityDate);
  renderOverallSubjectStatus(params.useCase, params.globalRecommendedCount);
  renderTodayActivity(records, params.useCase, params.selectedActivityDate);
  renderLearningStatusStars(params.useCase, params.globalRecommendedCount, params.selectedActivityDate);
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
