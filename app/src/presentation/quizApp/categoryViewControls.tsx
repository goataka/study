/**
 * カテゴリビュー操作コントロール（学年フィルター・ビューモード切替）の React 描画ヘルパー。
 *
 * `categoryControlsContentStore` 経由で React ツリーに描画する。
 * 公開 API（`renderCategoryViewControls(params)`）は互換維持。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import type { IProgressRepository } from "../../application/ports";
import { categoryControlsContentStore } from "../components/categoryControlsContentStore";
import { categoryViewToggleButton, gradeFilterButton } from "../styles/categoryControlButtonStyles";

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
  if (params.subject === "all" || params.subject === "progress") {
    // 総合タブ・進度タブ: コントロールは renderAllSubjectList/renderProgressView 内で描画するため不要。
    categoryControlsContentStore.reset();
    return;
  }

  // ── 学年フィルターボタン ──
  const grades = params.useCase.getUniqueGradesForSubject(params.subject);
  if (grades.length === 0) {
    // 学年情報がない場合はフィルターをリセットし、ビューモード切替ボタンのみ描画する。
    params.onGradeFilterReset();
    categoryControlsContentStore.set(<CategoryViewControls params={params} prefixes={[]} />);
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
  categoryControlsContentStore.set(<CategoryViewControls params={params} prefixes={visiblePrefixes} />);
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
      className={categoryViewToggleButton()}
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
    <div className="grade-filter-group flex items-center gap-[5px] ml-auto">
      <span className="grade-filter-label text-xs text-[#586069] ml-1">学年:</span>
      <button
        type="button"
        className={gradeFilterButton()}
        aria-pressed={params.selectedGradeFilter === null}
        onClick={() => params.onGradeFilterChange(null)}
      >
        すべて
      </button>
      {prefixes.map((prefix) => (
        <button
          key={prefix}
          type="button"
          className={gradeFilterButton()}
          aria-pressed={params.selectedGradeFilter === prefix}
          onClick={() => params.onGradeFilterChange(prefix)}
        >
          {PREFIX_LABEL[prefix] ?? prefix}
        </button>
      ))}
    </div>
  );
}
