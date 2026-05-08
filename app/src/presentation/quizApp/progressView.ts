/**
 * 進度タブの左パネル（教科リスト）を描画するヘルパー。
 *
 * 教科ごとの「学習済み単元数 / 総単元数」を表示し、クリックで教科切り替え。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import { SUBJECTS } from "../uiHelpers";
import type { ProgressStatusFilter } from "./urlStateService";

/** 進度タブ教科リストのコールバック群。 */
export interface ProgressSubjectListCallbacks {
  /** 現在選択中の教科 ID。アクティブ表示の判定に使う。 */
  currentSubjectId: string;
  /** 教科切り替え時に呼ばれる。 */
  onSelectSubject: (subjectId: string) => void;
}

/**
 * 進度タブ左パネル用の教科リストを構築して返す。
 */
export function buildProgressSubjectList(useCase: QuizUseCase, callbacks: ProgressSubjectListCallbacks): HTMLElement {
  const subjectList = document.createElement("div");
  subjectList.className = "progress-subject-list";

  const contentSubjects = SUBJECTS.filter((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress");
  for (const subj of contentSubjects) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "progress-subject-list-item";
    const isActive = subj.id === callbacks.currentSubjectId;
    if (isActive) item.classList.add("active");
    item.setAttribute("aria-pressed", String(isActive));
    item.setAttribute("data-subject", subj.id);

    const iconSpan = document.createElement("span");
    iconSpan.className = "progress-subject-list-icon";
    iconSpan.setAttribute("aria-hidden", "true");
    iconSpan.textContent = subj.icon;
    item.appendChild(iconSpan);

    const nameArea = document.createElement("div");
    nameArea.className = "progress-subject-list-name-area";

    const nameSpan = document.createElement("span");
    nameSpan.className = "progress-subject-list-name";
    nameSpan.textContent = subj.name;
    nameArea.appendChild(nameSpan);

    // 教科全体の学習済み単元数 / 総単元数（全問習得済みの単元のみカウント）
    const allCats = useCase.getCategoriesForSubject(subj.id);
    const catIds = Object.keys(allCats);
    let masteredUnitCount = 0;
    const totalUnitCount = catIds.length;
    for (const catId of catIds) {
      const { mastered, total } = useCase.getMasteredCountForCategory(subj.id, catId);
      if (total > 0 && mastered === total) masteredUnitCount++;
    }
    const statsSpan = document.createElement("span");
    statsSpan.className = "progress-subject-list-stats";
    statsSpan.textContent = `${masteredUnitCount} / ${totalUnitCount} 単元`;
    nameArea.appendChild(statsSpan);

    item.appendChild(nameArea);

    item.addEventListener("click", () => callbacks.onSelectSubject(subj.id));
    subjectList.appendChild(item);
  }
  return subjectList;
}

/**
 * 進度詳細パネルのタブ・フィルターボタンの状態を反映する（コンテンツ本体は別関数で描画）。
 */
export function syncProgressDetailControls(
  progressDetailViewMode: "grade" | "category" | "matrix",
  progressStatusFilter: ProgressStatusFilter,
): void {
  const panel = document.getElementById("progressDetailPanel");
  if (!panel) return;
  panel.classList.remove("hidden");

  const activeTabId = `progressDetailTab-${progressDetailViewMode}`;
  document.querySelectorAll<HTMLElement>(".panel-tab[data-progress-detail-panel]").forEach((t) => {
    const active = t.dataset.progressDetailPanel === progressDetailViewMode;
    t.classList.toggle("active", active);
    t.setAttribute("aria-selected", String(active));
    t.setAttribute("tabindex", active ? "0" : "-1");
  });
  document.getElementById("progressDetailContent")?.setAttribute("aria-labelledby", activeTabId);

  const filterButtons: Array<{ id: string; filter: ProgressStatusFilter }> = [
    { id: "progressStatusAllBtn", filter: "all" },
    { id: "progressStatusUnlearnedBtn", filter: "unlearned" },
    { id: "progressStatusStudyingBtn", filter: "studying" },
    { id: "progressStatusLearnedBtn", filter: "learned" },
  ];
  filterButtons.forEach(({ id, filter }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const active = progressStatusFilter === filter;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}
