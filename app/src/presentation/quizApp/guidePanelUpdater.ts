/**
 * 解説パネル (`#guidePanelFrame` 等) の解説 URL 解決と内容更新を行うヘルパー。
 *
 * 選択レベル（単元・親カテゴリ・トップカテゴリ・未選択）に応じて適切な guide URL を解決し、
 * `loadGuideContent` を呼び出して描画する。
 */

import type { QuizFilter, QuizUseCase } from "../../application/quizUseCase";
import { loadGuideContent as loadGuideContentFn } from "./guideLoader";

export type SelectionLevel = "none" | "topCategory" | "parentCategory" | "unit";

/** 解説 URL 解決のために参照する画面選択状態。 */
export interface GuideUrlResolverState {
  /** 単元コンテキスト（総合タブ等で単元を直接選択している場合）。 */
  selectedUnitContext: { subject: string; categoryId: string } | null;
  filter: QuizFilter;
  selectedTopCategoryId: string | null;
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
  noContentId: string,
): Promise<void> {
  const guideFrame = document.getElementById(frameId);
  const noContent = document.getElementById(noContentId);
  if (!guideFrame) return;

  const guideUrl = resolveGuideUrl(useCase, state);

  if (guideUrl) {
    guideFrame.classList.remove("hidden");
    noContent?.classList.add("hidden");
    await loadGuideContentFn(guideFrame, guideUrl, counterRef, noContent ?? undefined);
  } else {
    guideFrame.classList.add("hidden");
    noContent?.classList.remove("hidden");
  }
}
