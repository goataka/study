/**
 * 選択中単元情報パネル（`#selectedUnitInfo`）への単一単元の描画ヘルパー。
 *
 * useCase からカテゴリ情報を取得して `buildSelectedUnitInfoBody` に渡す薄いラッパー。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import { buildSelectedUnitInfoBody, buildSelectedUnitCloseButton } from "../selectedUnitInfoView";

/**
 * 単元 1 件分の詳細パネル（タイトル・カテゴリ・例文・進捗バー＋閉じるボタン）を
 * 指定したコンテナに描画する。
 */
export function renderSelectedUnitInfo(
  useCase: QuizUseCase,
  container: HTMLElement,
  subject: string,
  categoryId: string,
  categoryName: string,
  closeAriaLabel: string,
  onClose: () => void,
): void {
  container.classList.remove("hidden");
  container.innerHTML = "";

  const topInfo = useCase.getTopCategoryForUnit(subject, categoryId);
  const parentInfo = useCase.getParentCategoryForUnit(subject, categoryId);
  const grade = useCase.getCategoryReferenceGrade(subject, categoryId);
  const example = useCase.getCategoryExample(subject, categoryId);
  const description = useCase.getCategoryDescription(subject, categoryId);
  const { mastered, total } = useCase.getMasteredCountForCategory(subject, categoryId);
  const inProgressCount = useCase.getInProgressCount({ subject, category: categoryId });

  container.appendChild(
    buildSelectedUnitInfoBody({
      name: categoryName,
      topCatName: topInfo?.name,
      parentCatName: parentInfo?.name,
      grade,
      example,
      description,
      mastered,
      inProgressCount,
      total,
    }),
  );
  container.appendChild(buildSelectedUnitCloseButton(closeAriaLabel, onClose));
  document.getElementById("categoryList")?.classList.add("detail-active");
}
