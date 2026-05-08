/**
 * 「総合」タブ用の教科一覧描画ヘルパー。
 *
 * 各教科カードに推奨の単元・学年・進捗率を表示する。
 * 同一カテゴリの単元はまとめて表示し、トップカテゴリ・親カテゴリも合わせて表示する。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import {
  groupRecommendedByCategory,
  buildSubjectOverviewHeaderRow,
  buildSubjectOverviewEmptyItem,
  buildCategoryGroupHeader,
  buildRecommendedUnitCard,
} from "../allSubjectListView";
import { SUBJECTS } from "../uiHelpers";

/** 総合タブ教科一覧描画のパラメータ。 */
export interface RenderAllSubjectListParams {
  useCase: QuizUseCase;
  /** 教科ごとの推奨単元表示数。 */
  subjectRecommendedCounts: Map<string, number>;
  /** 表示数変更時に呼ばれる（永続化＋再描画）。 */
  onRecommendedCountChange: (subjectId: string, count: number) => void;
  /** 単元カードクリック時に呼ばれる。 */
  onSelectUnit: (subjectId: string, categoryId: string, categoryName: string) => void;
}

/** 「総合」タブ用の教科一覧を描画する。 */
export function renderAllSubjectList(params: RenderAllSubjectListParams): void {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;
  categoryList.innerHTML = "";

  const { useCase, subjectRecommendedCounts } = params;
  const nonAllSubjects = SUBJECTS.filter((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress");
  const studiedKeys = useCase.getStudiedCategoryKeys();

  for (const subject of nonAllSubjects) {
    const count = subjectRecommendedCounts.get(subject.id) ?? 1;
    const recommendedList = useCase.getRecommendedCategoriesForSubject(subject.id, count);

    const wrapper = document.createElement("div");
    wrapper.className = "subject-overview-wrapper";

    // 教科名行: アイコン・名称と教科ごとの表示数コントロール
    wrapper.appendChild(
      buildSubjectOverviewHeaderRow(subject, count, (n) => {
        params.onRecommendedCountChange(subject.id, n);
      }),
    );

    if (recommendedList.length === 0) {
      wrapper.appendChild(buildSubjectOverviewEmptyItem(subject.id));
      categoryList.appendChild(wrapper);
      continue;
    }

    // 同一親カテゴリでグループ化（未学習を含むグループ／単元が先頭）
    const groups = groupRecommendedByCategory(subject.id, recommendedList, useCase);

    // グループごとにヘッダーとカードを描画する
    for (const group of groups) {
      const catGroup = document.createElement("div");
      catGroup.className = "subject-overview-cat-group";

      const header = buildCategoryGroupHeader(group);
      if (header) catGroup.appendChild(header);

      for (const recommended of group.items) {
        const { mastered, total } = useCase.getMasteredCountForCategory(subject.id, recommended.id);
        const inProgressCount = useCase.getInProgressCount({ subject: subject.id, category: recommended.id });
        const catKey = `${subject.id}::${recommended.id}`;
        const isAllMastered = total > 0 && mastered === total;
        const isStudying = !isAllMastered && (inProgressCount > 0 || studiedKeys.has(catKey));

        catGroup.appendChild(
          buildRecommendedUnitCard(subject.id, recommended, { mastered, total, inProgressCount, isStudying }, () =>
            params.onSelectUnit(subject.id, recommended.id, recommended.name),
          ),
        );
      }

      wrapper.appendChild(catGroup);
    }

    categoryList.appendChild(wrapper);
  }
}
