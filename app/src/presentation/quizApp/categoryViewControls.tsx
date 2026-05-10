/**
 * カテゴリビュー操作コントロール（学年フィルター・ビューモード切替）の React 描画ヘルパー。
 *
 * もともと `controlsEl.appendChild(...)` で逐次組み立てていたものを、
 * `CategoryViewControls` React コンポーネントに置き換えた。
 * 公開 API（`renderCategoryViewControls(params)`）は互換維持。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import type { IProgressRepository } from "../../application/ports";
import { renderReactInto, clearReactContainer } from "./reactMount";

/** 学年フィルターボタンの共通 Tailwind クラス文字列。 */
const GRADE_FILTER_BTN_CLASSES =
  "grade-filter-btn text-xs px-2 py-0.5 border border-[#d1d5da] rounded-[10px] bg-white text-[#586069] cursor-pointer select-none transition-[background,color] duration-150 hover:bg-[#e8f0fe] hover:border-[#0366d6] hover:text-[#0366d6] [&[aria-pressed='true']]:bg-[#0366d6] [&[aria-pressed='true']]:border-[#0366d6] [&[aria-pressed='true']]:text-white";

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

const PREFIX_LABEL: Record<string, string> = { 小学: "小学", 中学: "中学", 高校: "高校" };

/**
 * カテゴリビュー操作コントロール（学年フィルター・ビューモード切替）を描画する。
 */
export function renderCategoryViewControls(params: CategoryViewControlsParams): void {
  const controlsEl = document.getElementById("categoryControls");
  if (!controlsEl) return;

  if (params.subject === "all" || params.subject === "progress") {
    // 総合タブ・進度タブ: コントロールは renderAllSubjectList/renderProgressView 内で描画するため不要。
    // 既存の中身を消しつつ、後続で renderReactInto が呼ばれた場合に新規 root を作るよう
    // マーカーも削除する。
    clearReactContainer(controlsEl);
    return;
  }

  // ── 学年フィルターボタン ──
  const grades = params.useCase.getUniqueGradesForSubject(params.subject);
  if (grades.length === 0) {
    // 学年情報がない場合はフィルターをリセットし、ビューモード切替ボタンのみ描画する。
    params.onGradeFilterReset();
    renderReactInto(controlsEl, <CategoryViewControls params={params} prefixes={[]} />);
    return;
  }

  // 利用可能な学年プレフィックスを収集
  const prefixes = collectGradePrefixes(grades);

  // 現在のフィルターが新しい教科で有効でない場合はリセット
  if (params.selectedGradeFilter !== null && !prefixes.includes(params.selectedGradeFilter)) {
    params.onGradeFilterReset();
  }

  // 1 種類以下なら学年フィルター UI は非表示（ビューモード切替ボタンのみ）
  const visiblePrefixes = prefixes.length < 2 ? [] : prefixes;
  renderReactInto(controlsEl, <CategoryViewControls params={params} prefixes={visiblePrefixes} />);
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

// ─── React コンポーネント ────────────────────────────────────────────────

interface CategoryViewControlsViewProps {
  params: CategoryViewControlsParams;
  /** 表示対象の学年プレフィックス。空配列なら学年フィルターを描画しない。 */
  prefixes: string[];
}

function CategoryViewControls({ params, prefixes }: CategoryViewControlsViewProps): React.JSX.Element {
  return (
    <>
      <ViewToggleButton params={params} />
      {prefixes.length >= 2 && <GradeFilterGroup prefixes={prefixes} params={params} />}
    </>
  );
}

function ViewToggleButton({ params }: { params: CategoryViewControlsParams }): React.JSX.Element {
  const isGrade = params.categoryViewMode === "grade";
  const handleClick = (): void => {
    const next: "category" | "grade" = isGrade ? "category" : "grade";
    params.progressRepo.saveCategoryViewMode(next);
    params.onViewModeChange(next);
  };
  return (
    <button
      type="button"
      className={[
        "category-view-toggle",
        "text-sm px-2 py-[3px] border border-[#d1d5da] rounded cursor-pointer select-none",
        "bg-white text-[#586069] transition-[background,color] duration-150",
        "hover:bg-[#e8f0fe] hover:border-[#0366d6] hover:text-[#0366d6]",
        "[&[aria-pressed='true']]:bg-[#0366d6] [&[aria-pressed='true']]:border-[#0366d6] [&[aria-pressed='true']]:text-white",
      ].join(" ")}
      aria-pressed={isGrade}
      title={isGrade ? "カテゴリ別表示に切り替える" : "学年別表示に切り替える"}
      onClick={handleClick}
    >
      {isGrade ? "🎓 学年別" : "📁 カテゴリ別"}
    </button>
  );
}

function GradeFilterGroup({
  prefixes,
  params,
}: {
  prefixes: string[];
  params: CategoryViewControlsParams;
}): React.JSX.Element {
  return (
    <div className="grade-filter-group flex items-center gap-[5px]">
      <span className="grade-filter-label text-xs text-[#586069] ml-1">学年:</span>
      <button
        type="button"
        className={GRADE_FILTER_BTN_CLASSES}
        aria-pressed={params.selectedGradeFilter === null}
        onClick={() => params.onGradeFilterChange(null)}
      >
        すべて
      </button>
      {prefixes.map((prefix) => (
        <button
          key={prefix}
          type="button"
          className={GRADE_FILTER_BTN_CLASSES}
          aria-pressed={params.selectedGradeFilter === prefix}
          onClick={() => params.onGradeFilterChange(prefix)}
        >
          {PREFIX_LABEL[prefix] ?? prefix}
        </button>
      ))}
    </div>
  );
}
