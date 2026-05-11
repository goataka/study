/**
 * 進度タブ詳細パネルのマトリクスビュー（React 版）。
 *
 * もともと `container.appendChild(...)` を組み合わせて 250 行超で構築していた
 * テーブルを、データ整形（純粋関数 `buildMatrixViewModel`）と JSX 描画
 * （`ProgressMatrixView` コンポーネント）に分離した。
 *
 * 公開 API（`renderProgressDetailMatrix`）は互換のため `(container, ctx)` の
 * 形を維持し、内部で `renderReactInto` を呼ぶ。
 */

import type { QuizUseCase } from "../application/quizUseCase";
import type { ProgressStatusFilter } from "./quizApp/urlStateService";
import { getLearningProgressStatus } from "./uiHelpers";
import { progressDetailContentStore } from "./components/progressDetailContentStore";

const EMPTY_PROGRESS = { mastered: 0, total: 0, inProgress: 0 } as const;

export interface ProgressMatrixContext {
  /** 描画対象の教科 ID */
  subject: string;
  /** ユースケース（カテゴリ・進捗の取得に利用する） */
  useCase: QuizUseCase;
  /** 縦横を入れ替え表示するか */
  transposed: boolean;
  /** 学習状況フィルター */
  statusFilter: ProgressStatusFilter;
  /** 縦横切り替えボタン押下時のコールバック（state を反転して再描画する） */
  onToggleTranspose: () => void;
  /** 単元ブロック押下時のコールバック */
  onSelectUnit: (subject: string, categoryId: string, categoryName: string) => void;
}

type ColDef = { parentId: string; parentName: string; topId: string; topName: string };

interface UnitVM {
  catId: string;
  catName: string;
  isMastered: boolean;
  isInProgress: boolean;
}

type CellUnits = UnitVM[];

interface MatrixViewModel {
  visibleGrades: string[];
  visibleCols: ColDef[];
  /** [grade][colIndex] → 表示する単元配列（フィルター済み）。 */
  cellsByGrade: Map<string, CellUnits[]>;
  topGroups: { topId: string; topName: string; count: number }[];
  empty: "no-units" | "no-visible" | null;
}

function buildUnitVM(
  catId: string,
  catName: string,
  p: { mastered: number; total: number; inProgress: number },
): UnitVM {
  const isMastered = p.mastered > 0 && p.mastered === p.total;
  const isInProgress = !isMastered && (p.inProgress > 0 || p.mastered > 0);
  return { catId, catName, isMastered, isInProgress };
}

function buildMatrixViewModel(ctx: ProgressMatrixContext): MatrixViewModel {
  const { subject, useCase } = ctx;
  const grades = useCase.getUniqueGradesForSubject(subject);
  const allCats = useCase.getCategoriesForSubject(subject);

  const categoryProgressMap = new Map<string, { mastered: number; total: number; inProgress: number }>();
  Object.keys(allCats).forEach((catId) => {
    const { mastered, total } = useCase.getMasteredCountForCategory(subject, catId);
    const inProgress = useCase.getInProgressCount({ subject, category: catId });
    categoryProgressMap.set(catId, { mastered, total, inProgress });
  });

  // ── 列定義（旧コードと同じ順序ロジック） ──
  const parentCatsMap = useCase.getParentCategoriesForSubject(subject);
  const colDefs: ColDef[] = [];
  const seenParents = new Set<string>();

  const topCatsMap = useCase.getTopCategoriesForSubject(subject);
  for (const [topId, topName] of Object.entries(topCatsMap)) {
    const parentCatsForTop = useCase.getParentCategoriesForTop(subject, topId);
    for (const [parentId, parentName] of Object.entries(parentCatsForTop)) {
      if (!seenParents.has(parentId)) {
        seenParents.add(parentId);
        colDefs.push({ parentId, parentName, topId, topName });
      }
    }
    const hasDirect = Object.keys(allCats).some((catId) => {
      const topInfo = useCase.getTopCategoryForUnit(subject, catId);
      const parentInfo = useCase.getParentCategoryForUnit(subject, catId);
      return topInfo?.id === topId && !parentInfo;
    });
    if (hasDirect && !seenParents.has(`__top_direct_${topId}__`)) {
      seenParents.add(`__top_direct_${topId}__`);
      colDefs.push({ parentId: `__top_direct_${topId}__`, parentName: topName, topId, topName });
    }
  }
  const noTopCats = Object.keys(allCats).filter((catId) => !useCase.getTopCategoryForUnit(subject, catId));
  if (noTopCats.length > 0) {
    colDefs.push({ parentId: "__other__", parentName: "その他", topId: "__other__", topName: "その他" });
  }
  for (const [parentId, parentName] of Object.entries(parentCatsMap)) {
    if (!seenParents.has(parentId)) {
      seenParents.add(parentId);
      colDefs.push({ parentId, parentName, topId: "__other__", topName: "その他" });
    }
  }

  if (grades.length === 0 || colDefs.length === 0) {
    return { visibleGrades: [], visibleCols: [], cellsByGrade: new Map(), topGroups: [], empty: "no-units" };
  }

  // ── フィルター ──
  const isUnitVisible = (catId: string): boolean => {
    if (ctx.statusFilter === "all") return true;
    const p = categoryProgressMap.get(catId) ?? EMPTY_PROGRESS;
    return getLearningProgressStatus(p) === ctx.statusFilter;
  };

  const gradeCatsMap = new Map<string, Record<string, string>>();
  for (const grade of grades) {
    gradeCatsMap.set(grade, useCase.getCategoriesForGrade(subject, grade));
  }

  const unitColumnCache = new Map<string, string>();
  for (const catId of Object.keys(allCats)) {
    const topInfo = useCase.getTopCategoryForUnit(subject, catId);
    const parentInfo = useCase.getParentCategoryForUnit(subject, catId);
    if (!topInfo) {
      unitColumnCache.set(catId, "__other__");
    } else if (!parentInfo) {
      unitColumnCache.set(catId, `__top_direct_${topInfo.id}__`);
    } else {
      unitColumnCache.set(catId, parentInfo.id);
    }
  }

  const isUnitInColumn = (catId: string, col: ColDef): boolean => {
    const colKey = unitColumnCache.get(catId);
    if (col.parentId === "__other__") return colKey === "__other__";
    if (col.parentId.startsWith("__top_direct_")) return colKey === col.parentId;
    return colKey === col.parentId;
  };

  const visibleGrades =
    ctx.statusFilter !== "all"
      ? grades.filter((grade) => {
          const gradeCats = gradeCatsMap.get(grade) ?? {};
          return Object.keys(gradeCats).some((catId) => isUnitVisible(catId));
        })
      : grades;

  const visibleCols =
    ctx.statusFilter !== "all"
      ? colDefs.filter((col) =>
          Object.keys(allCats).some((catId) => isUnitInColumn(catId, col) && isUnitVisible(catId)),
        )
      : colDefs;

  if (visibleGrades.length === 0 || visibleCols.length === 0) {
    return { visibleGrades: [], visibleCols: [], cellsByGrade: new Map(), topGroups: [], empty: "no-visible" };
  }

  // ── セル毎の単元配列を組み立て ──
  const cellsByGrade = new Map<string, CellUnits[]>();
  for (const grade of visibleGrades) {
    const gradeCats = gradeCatsMap.get(grade) ?? {};
    const row: CellUnits[] = visibleCols.map((col) => {
      const units: UnitVM[] = [];
      for (const [catId, catName] of Object.entries(gradeCats)) {
        if (!isUnitInColumn(catId, col)) continue;
        if (!isUnitVisible(catId)) continue;
        units.push(buildUnitVM(catId, catName, categoryProgressMap.get(catId) ?? EMPTY_PROGRESS));
      }
      return units;
    });
    cellsByGrade.set(grade, row);
  }

  // ── トップヘッダーの colSpan 用グルーピング ──
  const topGroups: { topId: string; topName: string; count: number }[] = [];
  for (const col of visibleCols) {
    const last = topGroups[topGroups.length - 1];
    if (last && last.topId === col.topId) {
      last.count++;
    } else {
      topGroups.push({ topId: col.topId, topName: col.topName, count: 1 });
    }
  }

  return { visibleGrades, visibleCols, cellsByGrade, topGroups, empty: null };
}

function buildMatrixCategoryLabel(col: ColDef): string {
  if (col.topId === "__other__" || col.topName === col.parentName) {
    return col.parentName;
  }
  return `${col.topName} / ${col.parentName}`;
}

// ─── React コンポーネント ────────────────────────────────────────────────

interface UnitBlockProps {
  unit: UnitVM;
  onSelect: (catId: string, catName: string) => void;
}
function UnitBlock({ unit, onSelect }: UnitBlockProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={[
        "progress-block progress-block-sm",
        // progress-block ベーススタイル
        "inline-flex items-center justify-start min-w-0 w-full px-1 py-0.5 m-0",
        "rounded-[3px] text-[10px] cursor-pointer border border-[#d1d5da] bg-[#f6f8fa] text-[#24292e]",
        "transition-[background] duration-100 leading-[1.3] break-all font-[inherit] text-left",
        "hover:brightness-[0.92] hover:z-[1]",
        // progress-block-sm 固有: 縦配置・幅いっぱい
        "flex whitespace-normal",
        "[&.mastered]:bg-[#28a745] [&.mastered]:border-[#28a745] [&.mastered]:text-white",
        "[&.in-progress]:bg-[#f9d952] [&.in-progress]:border-[#e0b800] [&.in-progress]:text-[#6a5500]",
        unit.isMastered ? "mastered" : "",
        unit.isInProgress ? "in-progress" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      title={unit.catName}
      onClick={() => onSelect(unit.catId, unit.catName)}
    >
      {unit.catName}
    </button>
  );
}

interface CornerToggleProps {
  transposed: boolean;
  onToggleTranspose: () => void;
}
function CornerToggle({ transposed, onToggleTranspose }: CornerToggleProps): React.JSX.Element {
  return (
    <button
      type="button"
      className="progress-matrix-corner-toggle-btn text-[0.75em] px-1.5 py-0.5 border border-[#c8d8f8] rounded bg-[#e8f0fe] text-[#0366d6] cursor-pointer whitespace-nowrap hover:bg-[#d0e4ff]"
      aria-label="学年とカテゴリの縦横を切り替える"
      aria-pressed={transposed}
      onClick={onToggleTranspose}
    >
      学年 ⇄ カテゴリ
    </button>
  );
}

function ProgressMatrixView({ ctx }: { ctx: ProgressMatrixContext }): React.JSX.Element {
  const vm = buildMatrixViewModel(ctx);
  if (vm.empty === "no-units") {
    return (
      <div
        className="progress-block-group flex flex-col gap-1.5 px-3 py-[10px] border border-[#e1e4e8] rounded-lg bg-white"
        role="status"
      >
        単元がありません
      </div>
    );
  }
  if (vm.empty === "no-visible") {
    return (
      <div
        className="progress-block-group flex flex-col gap-1.5 px-3 py-[10px] border border-[#e1e4e8] rounded-lg bg-white"
        role="status"
      >
        表示する単元がありません
      </div>
    );
  }

  const onSelect = (catId: string, catName: string): void => ctx.onSelectUnit(ctx.subject, catId, catName);

  return (
    <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
      <table className="progress-matrix-table progress-matrix-table-units">
        {ctx.transposed ? (
          <>
            <thead>
              <tr>
                <th className="progress-matrix-corner-toggle">
                  <CornerToggle transposed={ctx.transposed} onToggleTranspose={ctx.onToggleTranspose} />
                </th>
                {vm.visibleGrades.map((grade) => (
                  <th key={grade} className="progress-matrix-parent-header">
                    {grade}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vm.visibleCols.map((col, colIdx) => (
                <tr key={col.parentId}>
                  <th scope="row">{buildMatrixCategoryLabel(col)}</th>
                  {vm.visibleGrades.map((grade) => {
                    const units = vm.cellsByGrade.get(grade)?.[colIdx] ?? [];
                    return (
                      <td key={grade} className="progress-matrix-cell-units">
                        <div className="progress-matrix-cell-units-inner">
                          {units.map((u) => (
                            <UnitBlock key={u.catId} unit={u} onSelect={onSelect} />
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </>
        ) : (
          <>
            <thead>
              <tr>
                <th rowSpan={2} className="progress-matrix-corner-toggle">
                  <CornerToggle transposed={ctx.transposed} onToggleTranspose={ctx.onToggleTranspose} />
                </th>
                {vm.topGroups.map((grp, idx) => (
                  <th key={`${grp.topId}-${idx}`} colSpan={grp.count} className="progress-matrix-top-header">
                    {grp.topName}
                  </th>
                ))}
              </tr>
              <tr>
                {vm.visibleCols.map((col) => (
                  <th key={col.parentId} className="progress-matrix-parent-header">
                    {buildMatrixCategoryLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {vm.visibleGrades.map((grade) => (
                <tr key={grade}>
                  <th scope="row">{grade}</th>
                  {vm.visibleCols.map((col, colIdx) => {
                    const units = vm.cellsByGrade.get(grade)?.[colIdx] ?? [];
                    return (
                      <td key={col.parentId} className="progress-matrix-cell-units">
                        <div className="progress-matrix-cell-units-inner">
                          {units.map((u) => (
                            <UnitBlock key={u.catId} unit={u} onSelect={onSelect} />
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </>
        )}
      </table>
    </div>
  );
}

// ─── 公開 API（既存呼び出し元と互換） ───────────────────────────────────

/**
 * 進度詳細マトリクスビューを `container` に描画する（互換 API）。
 */
export function renderProgressDetailMatrix(_container: HTMLElement, ctx: ProgressMatrixContext): void {
  progressDetailContentStore.set(<ProgressMatrixView ctx={ctx} />);
}
