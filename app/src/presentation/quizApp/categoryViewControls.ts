/**
 * カテゴリビュー操作コントロール（学年フィルター・ビューモード切替）の描画ヘルパー。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import type { IProgressRepository } from "../../application/ports";

/** カテゴリビューコントロールへ渡すコールバックと状態。 */
export interface CategoryViewControlsParams {
  useCase: QuizUseCase;
  progressRepo: IProgressRepository;
  subject: string;
  categoryViewMode: "category" | "grade";
  selectedGradeFilter: string | null;
  /** ビューモード切替時に呼ばれる（新しいモードを引数で渡す）。 */
  onViewModeChange: (mode: "category" | "grade") => void;
  /** 学年フィルター変更時に呼ばれる（null = すべて）。 */
  onGradeFilterChange: (prefix: string | null) => void;
  /** 学年情報がなくフィルターをリセットする必要があるときに呼ばれる。 */
  onGradeFilterReset: () => void;
}

/**
 * カテゴリビュー操作コントロール（学年フィルター・ビューモード切替）を描画する。
 */
export function renderCategoryViewControls(params: CategoryViewControlsParams): void {
  const controlsEl = document.getElementById("categoryControls");
  if (!controlsEl) return;
  controlsEl.innerHTML = "";

  if (params.subject === "all" || params.subject === "progress") {
    // 総合タブ・進度タブ: コントロールは renderAllSubjectList/renderProgressView 内で描画するため不要
    return;
  }

  // ── ビューモード切替ボタン ──
  controlsEl.appendChild(buildViewToggleBtn(params));

  // ── 学年フィルターボタン ──
  const grades = params.useCase.getUniqueGradesForSubject(params.subject);
  if (grades.length === 0) {
    // 学年情報がない場合はフィルターをリセット
    params.onGradeFilterReset();
    return;
  }

  // 利用可能な学年プレフィックスを収集
  const prefixes = collectGradePrefixes(grades);

  // 現在のフィルターが新しい教科で有効でない場合はリセット
  if (params.selectedGradeFilter !== null && !prefixes.includes(params.selectedGradeFilter)) {
    params.onGradeFilterReset();
  }

  if (prefixes.length < 2) return; // 1 種類以下なら表示しない

  controlsEl.appendChild(buildGradeFilterGroup(prefixes, params));
}

function buildViewToggleBtn(params: CategoryViewControlsParams): HTMLButtonElement {
  const viewToggleBtn = document.createElement("button");
  viewToggleBtn.className = "category-view-toggle";
  viewToggleBtn.type = "button";
  viewToggleBtn.setAttribute("aria-pressed", String(params.categoryViewMode === "grade"));
  viewToggleBtn.textContent = params.categoryViewMode === "grade" ? "🎓 学年別" : "📁 カテゴリ別";
  viewToggleBtn.title = params.categoryViewMode === "grade" ? "カテゴリ別表示に切り替える" : "学年別表示に切り替える";
  viewToggleBtn.addEventListener("click", () => {
    const next: "category" | "grade" = params.categoryViewMode === "category" ? "grade" : "category";
    params.progressRepo.saveCategoryViewMode(next);
    params.onViewModeChange(next);
  });
  return viewToggleBtn;
}

function collectGradePrefixes(grades: string[]): string[] {
  const prefixes: string[] = [];
  const seen = new Set<string>();
  for (const grade of grades) {
    const prefix = grade.startsWith("小")
      ? "小学"
      : grade.startsWith("中")
        ? "中学"
        : grade.startsWith("高")
          ? "高校"
          : "";
    if (prefix && !seen.has(prefix)) {
      seen.add(prefix);
      prefixes.push(prefix);
    }
  }
  return prefixes;
}

function buildGradeFilterGroup(prefixes: string[], params: CategoryViewControlsParams): HTMLDivElement {
  const gradeFilterGroup = document.createElement("div");
  gradeFilterGroup.className = "grade-filter-group";

  const filterLabel = document.createElement("span");
  filterLabel.className = "grade-filter-label";
  filterLabel.textContent = "学年:";
  gradeFilterGroup.appendChild(filterLabel);

  // 「すべて」ボタン
  const allBtn = document.createElement("button");
  allBtn.className = "grade-filter-btn";
  allBtn.type = "button";
  allBtn.textContent = "すべて";
  allBtn.setAttribute("aria-pressed", String(params.selectedGradeFilter === null));
  allBtn.addEventListener("click", () => params.onGradeFilterChange(null));
  gradeFilterGroup.appendChild(allBtn);

  const labelMap: Record<string, string> = { 小学: "小学", 中学: "中学", 高校: "高校" };
  for (const prefix of prefixes) {
    const btn = document.createElement("button");
    btn.className = "grade-filter-btn";
    btn.type = "button";
    btn.textContent = labelMap[prefix] ?? prefix;
    btn.setAttribute("aria-pressed", String(params.selectedGradeFilter === prefix));
    btn.addEventListener("click", () => params.onGradeFilterChange(prefix));
    gradeFilterGroup.appendChild(btn);
  }

  return gradeFilterGroup;
}
