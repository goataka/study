/**
 * 教科フィルターに応じてカテゴリリスト全体（左パネル）の描画を分岐するルーター。
 *
 * - "all" → 総合タブの教科一覧
 * - "admin" → 管理タブのメニュー
 * - "progress" → 進度タブの教科リスト
 * - その他 → 通常の単元一覧（カテゴリ別 or 学年別）
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import type { IProgressRepository } from "../../application/ports";
import { renderAdminContent } from "../adminPanel";

/** renderCategoryList ルーターのパラメータ。 */
export interface RenderCategoryListRouterParams {
  useCase: QuizUseCase;
  progressRepo: IProgressRepository;
  subject: string;
  categoryViewMode: "category" | "grade";
  shareUrl: string;
  /** 各サブビュー描画の副作用群。 */
  renderAllSubjectList: () => void;
  renderCategoryViewControls: () => void;
  renderProgressView: () => void;
  renderCategoryListByGrade: () => void;
  renderCategoryListByCategory: () => void;
  updateCategoryListActive: () => void;
  applyCategoryStatusFilter: () => void;
  updateSubjectStats: () => void;
  showConfirmDialog: (msg: string, alertOnly?: boolean) => Promise<boolean>;
}

/**
 * 教科フィルターに応じてカテゴリリストを描画する。
 */
export function renderCategoryListRouter(params: RenderCategoryListRouterParams): void {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  categoryList.innerHTML = "";

  const { subject } = params;

  if (subject === "all") {
    params.renderAllSubjectList();
    params.renderCategoryViewControls();
    return;
  }

  if (subject === "admin") {
    // 管理タブでは学年フィルター・表示切替コントロールを非表示にする
    const controlsEl = document.getElementById("categoryControls");
    if (controlsEl) controlsEl.innerHTML = "";
    // タイトルを「⚙️ メニュー」に変更
    const titleEl = document.getElementById("categoryListTitle");
    if (titleEl) titleEl.textContent = "⚙️ メニュー";
    renderAdminContent(categoryList, {
      useCase: params.useCase,
      progressRepo: params.progressRepo,
      shareUrl: params.shareUrl,
      showConfirmDialog: params.showConfirmDialog,
    });
    return;
  }

  if (subject === "progress") {
    // 進度タブ: コントロールをクリアし、タイトルを設定して進度ビューを描画する
    const controlsEl = document.getElementById("categoryControls");
    if (controlsEl) controlsEl.innerHTML = "";
    const titleEl = document.getElementById("categoryListTitle");
    if (titleEl) titleEl.textContent = "📚 教科";
    params.renderProgressView();
    return;
  }

  // コントロールを先に描画し、教科切替時の学年フィルターの妥当性チェックを行う
  params.renderCategoryViewControls();

  // タイトルを「📚 単元一覧」に戻す（管理タブから切り替えた場合）
  const titleEl = document.getElementById("categoryListTitle");
  if (titleEl) titleEl.textContent = "📚 単元一覧";

  if (params.categoryViewMode === "grade") {
    params.renderCategoryListByGrade();
  } else {
    params.renderCategoryListByCategory();
  }

  // アクティブ状態を更新
  params.updateCategoryListActive();
  // 学習状態フィルターを適用する
  params.applyCategoryStatusFilter();
  // 進捗バー・学習状態を更新する（ビューモード・フィルター切替後も正確に反映する）
  params.updateSubjectStats();
}
