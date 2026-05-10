/**
 * 進度タブ詳細パネルの「学年別」「カテゴリ別」ビュー（React 版）。
 *
 * もともと `container.appendChild(...)` を組み合わせていた命令的な版を、
 * データ計算（純粋関数）と JSX レンダリングに分離した。
 * `renderProgressDetailByGrade` / `renderProgressDetailByCategory` の公開 API は
 * 互換のため `(container, ctx)` の形で残し、内部で `renderReactInto` を呼ぶ。
 */

import type { QuizUseCase } from "../application/quizUseCase";
import type { ProgressStatusFilter } from "./quizApp/urlStateService";
import { getLearningProgressStatus } from "./uiHelpers";
import { renderReactInto } from "./quizApp/reactMount";
import { Fragment } from "react";

export interface ProgressBlockContext {
  /** 描画対象の教科 ID */
  subject: string;
  /** ユースケース（カテゴリ・進捗の取得に利用する） */
  useCase: QuizUseCase;
  /** 学習状況フィルター */
  statusFilter: ProgressStatusFilter;
  /** 単元ブロック押下時のコールバック */
  onSelectUnit: (subject: string, categoryId: string, categoryName: string) => void;
}

type CategoryProgress = {
  mastered: number;
  total: number;
  inProgress: number;
};

interface BlockGroupVM {
  /** ヘッダーに表示するグループ名（学年名・親カテゴリ名等）。 */
  groupName: string;
  /** 全問習得済みの単元数。 */
  mastered: number;
  /** 表示対象の単元総数。 */
  total: number;
  /** 表示する単元エントリ。 */
  entries: BlockEntryVM[];
}

interface BlockEntryVM {
  catId: string;
  catName: string;
  /** 全問習得済みか。 */
  isMastered: boolean;
  /** 学習中か（一部正解 or 未習得だが回答済み）。 */
  isInProgress: boolean;
}

interface TopGroupVM {
  topName: string;
  groups: BlockGroupVM[];
}

function buildCategoryProgressMap(useCase: QuizUseCase, subject: string): Map<string, CategoryProgress> {
  const categoryProgressMap = new Map<string, CategoryProgress>();
  for (const catId of Object.keys(useCase.getCategoriesForSubject(subject))) {
    const { mastered, total } = useCase.getMasteredCountForCategory(subject, catId);
    const inProgress = useCase.getInProgressCount({ subject, category: catId });
    categoryProgressMap.set(catId, { mastered, total, inProgress });
  }
  return categoryProgressMap;
}

function isVisibleCategory(ctx: ProgressBlockContext, progress: CategoryProgress | undefined): boolean {
  if (!progress) return false;
  return ctx.statusFilter === "all" || getLearningProgressStatus(progress) === ctx.statusFilter;
}

function buildBlockEntry(catId: string, catName: string, progress: CategoryProgress): BlockEntryVM {
  const isMastered = progress.mastered > 0 && progress.mastered === progress.total;
  const isInProgress = !isMastered && (progress.inProgress > 0 || progress.mastered > 0);
  return { catId, catName, isMastered, isInProgress };
}

function countMastered(entries: BlockEntryVM[]): number {
  return entries.reduce((n, e) => n + (e.isMastered ? 1 : 0), 0);
}

function visibleEntries(
  ctx: ProgressBlockContext,
  catEntries: [string, string][],
  progressMap: Map<string, CategoryProgress>,
): BlockEntryVM[] {
  const result: BlockEntryVM[] = [];
  for (const [catId, catName] of catEntries) {
    const p = progressMap.get(catId);
    if (!isVisibleCategory(ctx, p)) continue;
    result.push(buildBlockEntry(catId, catName, p!));
  }
  return result;
}

function buildGroup(
  ctx: ProgressBlockContext,
  catEntries: [string, string][],
  progressMap: Map<string, CategoryProgress>,
  groupName: string,
): BlockGroupVM | null {
  const entries = visibleEntries(ctx, catEntries, progressMap);
  if (entries.length === 0) return null;
  return {
    groupName,
    mastered: countMastered(entries),
    total: entries.length,
    entries,
  };
}

/** 学年別ビューの ViewModel を構築する（純粋関数）。 */
function buildGradeViewModel(ctx: ProgressBlockContext): BlockGroupVM[] {
  const { subject, useCase } = ctx;
  const grades = useCase.getUniqueGradesForSubject(subject);
  const progressMap = buildCategoryProgressMap(useCase, subject);

  const groups: BlockGroupVM[] = [];
  for (const grade of grades) {
    const cats = useCase.getCategoriesForGrade(subject, grade);
    const g = buildGroup(ctx, Object.entries(cats), progressMap, grade);
    if (g) groups.push(g);
  }
  const uncategorized = useCase.getCategoriesWithoutGrade(subject);
  const u = buildGroup(ctx, Object.entries(uncategorized), progressMap, "学年未設定");
  if (u) groups.push(u);
  return groups;
}

/** カテゴリ別ビューの ViewModel を構築する（純粋関数）。 */
function buildCategoryViewModel(ctx: ProgressBlockContext): {
  topGroups: TopGroupVM[];
  noTopGroups: BlockGroupVM[];
  standalone: BlockGroupVM | null;
  empty: boolean;
  noUnits: boolean;
} {
  const { subject, useCase } = ctx;
  const allCats = useCase.getCategoriesForSubject(subject);
  const catEntries = Object.entries(allCats);
  if (catEntries.length === 0) {
    return { topGroups: [], noTopGroups: [], standalone: null, empty: true, noUnits: true };
  }
  const progressMap = buildCategoryProgressMap(useCase, subject);

  // トップ → 親 → 単元 のツリーを構築
  const topMap = new Map<
    string,
    { name: string; parentMap: Map<string, { name: string; categories: [string, string][] }> }
  >();
  const noTopParentMap = new Map<string, { name: string; categories: [string, string][] }>();
  const standaloneCats: [string, string][] = [];

  for (const [catId, catName] of catEntries) {
    const topInfo = useCase.getTopCategoryForUnit(subject, catId);
    const parentInfo = useCase.getParentCategoryForUnit(subject, catId);

    if (topInfo) {
      if (!topMap.has(topInfo.id)) {
        topMap.set(topInfo.id, { name: topInfo.name, parentMap: new Map() });
      }
      const topEntry = topMap.get(topInfo.id)!;
      const parentKey = parentInfo?.id ?? "__none__";
      const parentName = parentInfo?.name ?? topInfo.name;
      if (!topEntry.parentMap.has(parentKey)) {
        topEntry.parentMap.set(parentKey, { name: parentName, categories: [] });
      }
      topEntry.parentMap.get(parentKey)!.categories.push([catId, catName]);
    } else if (parentInfo) {
      if (!noTopParentMap.has(parentInfo.id)) {
        noTopParentMap.set(parentInfo.id, { name: parentInfo.name, categories: [] });
      }
      noTopParentMap.get(parentInfo.id)!.categories.push([catId, catName]);
    } else {
      standaloneCats.push([catId, catName]);
    }
  }

  const topGroups: TopGroupVM[] = [];
  for (const [, { name: topName, parentMap }] of topMap) {
    const groups: BlockGroupVM[] = [];
    for (const [, { name, categories }] of parentMap) {
      const g = buildGroup(ctx, categories, progressMap, name);
      if (g) groups.push(g);
    }
    if (groups.length > 0) topGroups.push({ topName, groups });
  }

  const noTopGroups: BlockGroupVM[] = [];
  for (const [, { name, categories }] of noTopParentMap) {
    const g = buildGroup(ctx, categories, progressMap, name);
    if (g) noTopGroups.push(g);
  }

  let standalone: BlockGroupVM | null = null;
  const visibleStandaloneCats = standaloneCats.filter(([catId]) => isVisibleCategory(ctx, progressMap.get(catId)));
  if (visibleStandaloneCats.length > 0) {
    const groupName = topMap.size + noTopParentMap.size > 0 ? "その他" : "すべての単元";
    standalone = buildGroup(ctx, visibleStandaloneCats, progressMap, groupName);
  }

  const empty = topGroups.length === 0 && noTopGroups.length === 0 && standalone === null;
  return { topGroups, noTopGroups, standalone, empty, noUnits: false };
}

// ─── React コンポーネント ────────────────────────────────────────────────

interface BlockGroupProps {
  vm: BlockGroupVM;
  onSelect: (catId: string, catName: string) => void;
}

function BlockGroup({ vm, onSelect }: BlockGroupProps): React.JSX.Element {
  return (
    <div className="progress-block-group flex flex-col gap-1.5 px-3 py-[10px] border border-[#e1e4e8] rounded-lg bg-white">
      <div className="progress-block-group-header flex flex-row items-center gap-2 flex-wrap">
        <span className="progress-block-group-name text-[15px] font-bold text-[#24292e] shrink min-w-0 break-words">{vm.groupName}</span>
        <span className="progress-block-group-stats text-xs text-[#586069] shrink-0">{`(${vm.mastered}/${vm.total})`}</span>
      </div>
      <div className="progress-block-sequence flex flex-row flex-wrap gap-[3px]">
        {vm.entries.map((e) => (
          <button
            key={e.catId}
            type="button"
            className={[
              "progress-block",
              "inline-flex items-center justify-center min-w-[60px] max-w-[140px] px-1.5 py-[3px]",
              "rounded-[3px] text-[11px] cursor-pointer border border-[#d1d5da] bg-[#f6f8fa] text-[#24292e]",
              "transition-[background] duration-100 overflow-hidden leading-[1.3] break-words font-[inherit] text-left",
              "hover:brightness-[0.92] hover:z-[1]",
              "[&.mastered]:bg-[#28a745] [&.mastered]:border-[#28a745] [&.mastered]:text-white",
              "[&.in-progress]:bg-[#f9d952] [&.in-progress]:border-[#e0b800] [&.in-progress]:text-[#6a5500]",
              e.isMastered ? "mastered" : "",
              e.isInProgress ? "in-progress" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={e.catName}
            aria-label={e.catName}
            onClick={() => onSelect(e.catId, e.catName)}
          >
            {e.catName}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyMessage(): React.JSX.Element {
  return (
    <div className="progress-block-group flex flex-col gap-1.5 px-3 py-[10px] border border-[#e1e4e8] rounded-lg bg-white" role="status">
      表示する単元がありません
    </div>
  );
}

function ProgressDetailByGradeView({ ctx }: { ctx: ProgressBlockContext }): React.JSX.Element {
  const groups = buildGradeViewModel(ctx);
  const onSelect = (catId: string, catName: string): void => ctx.onSelectUnit(ctx.subject, catId, catName);
  if (groups.length === 0) return <EmptyMessage />;
  return (
    <>
      {groups.map((g) => (
        <BlockGroup key={g.groupName} vm={g} onSelect={onSelect} />
      ))}
    </>
  );
}

function ProgressDetailByCategoryView({ ctx }: { ctx: ProgressBlockContext }): React.JSX.Element {
  const vm = buildCategoryViewModel(ctx);
  const onSelect = (catId: string, catName: string): void => ctx.onSelectUnit(ctx.subject, catId, catName);
  if (vm.noUnits) {
    return <div className="progress-block-group flex flex-col gap-1.5 px-3 py-[10px] border border-[#e1e4e8] rounded-lg bg-white">単元がありません</div>;
  }
  if (vm.empty) return <EmptyMessage />;
  return (
    <>
      {vm.topGroups.map((tg) => (
        <Fragment key={tg.topName}>
          <div className="progress-top-category-header text-sm font-bold text-[#0366d6] px-3 pt-1.5 pb-0.5 border-b-2 border-[#c8d8e8] mt-1.5">{tg.topName}</div>
          {tg.groups.map((g) => (
            <BlockGroup key={g.groupName} vm={g} onSelect={onSelect} />
          ))}
        </Fragment>
      ))}
      {vm.noTopGroups.map((g) => (
        <BlockGroup key={g.groupName} vm={g} onSelect={onSelect} />
      ))}
      {vm.standalone && <BlockGroup vm={vm.standalone} onSelect={onSelect} />}
    </>
  );
}

// ─── 公開 API（既存呼び出し元と互換） ───────────────────────────────────

/**
 * 進度詳細の学年別ビューを描画する（互換 API）。
 */
export function renderProgressDetailByGrade(container: HTMLElement, ctx: ProgressBlockContext): void {
  renderReactInto(container, <ProgressDetailByGradeView ctx={ctx} />);
}

/**
 * 進度詳細のカテゴリ別ビューを描画する（互換 API）。
 */
export function renderProgressDetailByCategory(container: HTMLElement, ctx: ProgressBlockContext): void {
  renderReactInto(container, <ProgressDetailByCategoryView ctx={ctx} />);
}
