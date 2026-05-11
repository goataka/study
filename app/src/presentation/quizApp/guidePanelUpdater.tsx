/**
 * 解説パネル (`#guidePanelFrame` 等) の解説 URL 解決と内容更新を行うヘルパー。
 *
 * 選択レベル（単元・親カテゴリ・トップカテゴリ・未選択）に応じて適切な guide URL を解決し、
 * `guidePanelContentStore` を更新して描画する。
 */

import * as React from "react";
import type { QuizFilter, QuizUseCase } from "../../application/quizUseCase";
import { GradeGuideContent, type GradeGuideEntry } from "../components/GradeGuideContent";
import { GuideContent } from "../components/GuideContent";
import { guidePanelContentStore } from "../components/guidePanelContentStore";

export type SelectionLevel = "none" | "topCategory" | "parentCategory" | "unit";

/** 解説 URL 解決のために参照する画面選択状態。 */
export interface GuideUrlResolverState {
  /** 単元コンテキスト（総合タブ等で単元を直接選択している場合）。 */
  selectedUnitContext: { subject: string; categoryId: string } | null;
  filter: QuizFilter;
  selectedTopCategoryId: string | null;
  /** 学年別ビューで選択中の学年グループ。 */
  selectedGradeGroup?: string | null;
  /** 教科タブでの選択レベル。 */
  selectionLevel: SelectionLevel;
}

/** loadGuideContent に渡すレース管理用カウンタ。 */
export interface GuideLoadCounterRef {
  nextToken: () => number;
  currentToken: () => number;
}

/**
 * 選択状態に応じて解説 URL を解決する。
 */
export function resolveGuideUrl(useCase: QuizUseCase, state: GuideUrlResolverState): string | undefined {
  if (state.selectedUnitContext !== null) {
    return useCase.getCategoryGuideUrl(state.selectedUnitContext.subject, state.selectedUnitContext.categoryId);
  }
  switch (state.selectionLevel) {
    case "unit":
      return useCase.getCategoryGuideUrl(state.filter.subject, state.filter.category);
    case "parentCategory":
      return state.filter.parentCategory
        ? useCase.getParentCategoryGuideUrl(state.filter.subject, state.filter.parentCategory)
        : undefined;
    case "topCategory":
      return state.selectedTopCategoryId
        ? useCase.getTopCategoryGuideUrl(state.filter.subject, state.selectedTopCategoryId)
        : undefined;
    default:
      return useCase.getFirstAvailableGuideUrl();
  }
}

/**
 * 指定したコンテナ要素と空表示要素 ID を使って解説コンテンツを更新する共通処理。
 *
 * - 選択レベルに応じて解説 URL を決定する
 * - URL があれば解説をロードして表示、なければ空表示
 */
export async function updateGuidePanelContentByIds(
  useCase: QuizUseCase,
  state: GuideUrlResolverState,
  counterRef: GuideLoadCounterRef,
  frameId: string,
  _noContentId: string,
): Promise<void> {
  if (state.selectedGradeGroup && state.filter.subject !== "all" && state.filter.subject !== "progress") {
    counterRef.nextToken();
    renderGradeGuideContent(useCase, state.filter.subject, state.selectedGradeGroup);
    return;
  }

  const guideUrl = resolveGuideUrl(useCase, state);

  if (guideUrl) {
    guidePanelContentStore.set(<GuideContent guideUrl={guideUrl} />);
  } else {
    guidePanelContentStore.reset();
  }

  // frameId は後方互換のため引数に残すが、ストアベース描画では不要
  void frameId;
}

function renderGradeGuideContent(useCase: QuizUseCase, subject: string, grade: string): void {
  const categories =
    grade === "none" ? useCase.getCategoriesWithoutGrade(subject) : useCase.getCategoriesForGrade(subject, grade);
  const title = grade === "none" ? "学年未設定" : grade;
  const entries: GradeGuideEntry[] = Object.entries(categories).map(([categoryId, categoryName]) => ({
    id: categoryId,
    name: categoryName,
    description: useCase.getCategoryDescription(subject, categoryId),
  }));
  guidePanelContentStore.set(<GradeGuideContent title={title} entries={entries} />);
}
