/**
 * 「進度」タブ全体の描画ヘルパー（純粋関数）。
 *
 * 左パネル（教科リスト）と右パネル（学年別／カテゴリ別／マトリクス詳細）の描画を
 * `progressBlockView` / `progressMatrixView` / `progressView` に委譲する。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import { renderProgressDetailMatrix } from "../progressMatrixView";
import { renderProgressDetailByGrade, renderProgressDetailByCategory } from "../progressBlockView";
import { renderProgressSubjectList, syncProgressDetailControls } from "./progressView";
import { categoryListContentStore } from "../components/categoryListContentStore";
import { categoryControlsContentStore } from "../components/categoryControlsContentStore";

/** 進度タブ詳細パネルの表示モード。 */
export type ProgressDetailViewMode = "grade" | "category" | "matrix";

/** 進度タブの学習状況フィルター。 */
export type ProgressStatusFilterValue = "all" | "unlearned" | "studying" | "learned";

/**
 * 進度タブのビュー全体（左パネル＋右パネル）を描画する。
 */
export function renderProgressView(params: {
  useCase: QuizUseCase;
  progressSubjectId: string;
  progressDetailViewMode: ProgressDetailViewMode;
  progressStatusFilter: ProgressStatusFilterValue;
  progressGradeFilter: "小学" | "中学" | "高校" | null;
  progressMatrixTransposed: boolean;
  onSelectSubject: (subjectId: string) => void;
  onSelectUnit: (subject: string, catId: string, catName: string) => void;
  onToggleMatrixTranspose: () => void;
}): void {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;
  // 進度タブ自身が categoryList を React で再描画するため、wipe 時はストアをリセットする
  categoryListContentStore.reset();
  categoryControlsContentStore.reset();

  // ── 左パネル: 教科リスト（React 描画） ──
  renderProgressSubjectList(categoryList, params.useCase, {
    currentSubjectId: params.progressSubjectId,
    onSelectSubject: params.onSelectSubject,
  });

  // ── 右パネル: 進度詳細 ──
  renderProgressDetailPanel({
    useCase: params.useCase,
    progressSubjectId: params.progressSubjectId,
    progressDetailViewMode: params.progressDetailViewMode,
    progressStatusFilter: params.progressStatusFilter,
    progressGradeFilter: params.progressGradeFilter,
    progressMatrixTransposed: params.progressMatrixTransposed,
    onSelectUnit: params.onSelectUnit,
    onToggleMatrixTranspose: params.onToggleMatrixTranspose,
  });
}

/**
 * 進度タブ詳細パネル（右パネル）を描画する。
 * 学年別またはカテゴリ別でグループ化した単元名ブロック列を表示する。
 */
export function renderProgressDetailPanel(params: {
  useCase: QuizUseCase;
  progressSubjectId: string;
  progressDetailViewMode: ProgressDetailViewMode;
  progressStatusFilter: ProgressStatusFilterValue;
  progressGradeFilter: "小学" | "中学" | "高校" | null;
  progressMatrixTransposed: boolean;
  onSelectUnit: (subject: string, catId: string, catName: string) => void;
  onToggleMatrixTranspose: () => void;
}): void {
  syncProgressDetailControls(params.progressDetailViewMode, params.progressStatusFilter, params.progressGradeFilter);
  renderProgressDetailContent(params);
}

/**
 * 進度タブ詳細パネルのコンテンツ部分を描画する。
 * progressDetailViewMode に応じて学年別・カテゴリ別・マトリクスを描画する。
 */
export function renderProgressDetailContent(params: {
  useCase: QuizUseCase;
  progressSubjectId: string;
  progressDetailViewMode: ProgressDetailViewMode;
  progressStatusFilter: ProgressStatusFilterValue;
  progressGradeFilter: "小学" | "中学" | "高校" | null;
  progressMatrixTransposed: boolean;
  onSelectUnit: (subject: string, catId: string, catName: string) => void;
  onToggleMatrixTranspose: () => void;
}): void {
  const content = document.getElementById("progressDetailContent");
  if (!content) return;

  const blockCtx = {
    subject: params.progressSubjectId,
    useCase: params.useCase,
    statusFilter: params.progressStatusFilter,
    gradeFilterPrefix: params.progressGradeFilter,
    onSelectUnit: params.onSelectUnit,
  };
  if (params.progressDetailViewMode === "grade") {
    renderProgressDetailByGrade(content, blockCtx);
  } else if (params.progressDetailViewMode === "matrix") {
    renderProgressDetailMatrix(content, {
      subject: params.progressSubjectId,
      useCase: params.useCase,
      transposed: params.progressMatrixTransposed,
      statusFilter: params.progressStatusFilter,
      gradeFilterPrefix: params.progressGradeFilter,
      onToggleTranspose: params.onToggleMatrixTranspose,
      onSelectUnit: blockCtx.onSelectUnit,
    });
  } else {
    renderProgressDetailByCategory(content, blockCtx);
  }
}
