/**
 * 「総合」タブ用の教科一覧描画ヘルパー（React 版）。
 *
 * 各教科カードに推奨の単元・学年・進捗率を表示する。
 * 同一カテゴリの単元はまとめて表示し、トップカテゴリ・親カテゴリも合わせて表示する。
 *
 * `categoryList` 共有コンテナへ React で同期描画する。
 * 公開 API（`renderAllSubjectList(params)`）と DOM の class 構造は既存実装と完全互換。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import { groupRecommendedByCategory, type RecommendedItem } from "../recommendedGrouping";
import { SUBJECTS, gradeColorClass, calcDualProgressPct } from "../uiHelpers";
import { categoryListContentStore } from "../components/categoryListContentStore";

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

interface SubjectInfo {
  id: string;
  name: string;
  icon: string;
}

interface UnitStats {
  mastered: number;
  total: number;
  inProgressCount: number;
  isStudying: boolean;
}

interface SubjectViewModel {
  subject: SubjectInfo;
  count: number;
  /** items が空のときは「単元なし」を表示する。 */
  groups: Array<{
    topCatId: string;
    topCatName: string;
    parentCatId: string;
    parentCatName: string;
    items: Array<{ recommended: RecommendedItem; stats: UnitStats }>;
  }>;
  hasItems: boolean;
}

const RECOMMENDED_COUNT_OPTIONS = [1, 3, 5];

/** useCase からビューモデルを作る純粋関数。 */
export function buildAllSubjectViewModel(params: {
  useCase: QuizUseCase;
  subjectRecommendedCounts: Map<string, number>;
}): SubjectViewModel[] {
  const { useCase, subjectRecommendedCounts } = params;
  const nonAllSubjects = SUBJECTS.filter((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress");
  const studiedKeys = useCase.getStudiedCategoryKeys();

  return nonAllSubjects.map((subject) => {
    const count = subjectRecommendedCounts.get(subject.id) ?? 1;
    const recommendedList = useCase.getRecommendedCategoriesForSubject(subject.id, count);
    if (recommendedList.length === 0) {
      return { subject, count, groups: [], hasItems: false };
    }
    const groups = groupRecommendedByCategory(subject.id, recommendedList, useCase).map((g) => ({
      ...g,
      items: g.items.map((recommended) => {
        const { mastered, total } = useCase.getMasteredCountForCategory(subject.id, recommended.id);
        const inProgressCount = useCase.getInProgressCount({ subject: subject.id, category: recommended.id });
        const catKey = `${subject.id}::${recommended.id}`;
        const isAllMastered = total > 0 && mastered === total;
        const isStudying = !isAllMastered && (inProgressCount > 0 || studiedKeys.has(catKey));
        return { recommended, stats: { mastered, total, inProgressCount, isStudying } };
      }),
    }));
    return { subject, count, groups, hasItems: true };
  });
}

/** 「総合」タブ用の教科一覧を描画する。 */
export function renderAllSubjectList(params: RenderAllSubjectListParams): void {
  const subjects = buildAllSubjectViewModel({
    useCase: params.useCase,
    subjectRecommendedCounts: params.subjectRecommendedCounts,
  });
  categoryListContentStore.set(
    <AllSubjectList
      subjects={subjects}
      onRecommendedCountChange={params.onRecommendedCountChange}
      onSelectUnit={params.onSelectUnit}
    />,
  );
}

// ─── React コンポーネント ────────────────────────────────────────────────

interface AllSubjectListProps {
  subjects: SubjectViewModel[];
  onRecommendedCountChange: (subjectId: string, count: number) => void;
  onSelectUnit: (subjectId: string, categoryId: string, categoryName: string) => void;
}

function AllSubjectList({ subjects, onRecommendedCountChange, onSelectUnit }: AllSubjectListProps): React.JSX.Element {
  return (
    <>
      {subjects.map((vm) => (
        <SubjectOverviewWrapper
          key={vm.subject.id}
          vm={vm}
          onRecommendedCountChange={onRecommendedCountChange}
          onSelectUnit={onSelectUnit}
        />
      ))}
    </>
  );
}

function SubjectOverviewWrapper({
  vm,
  onRecommendedCountChange,
  onSelectUnit,
}: {
  vm: SubjectViewModel;
  onRecommendedCountChange: (subjectId: string, count: number) => void;
  onSelectUnit: (subjectId: string, categoryId: string, categoryName: string) => void;
}): React.JSX.Element {
  return (
    <div className="subject-overview-wrapper flex flex-col gap-0">
      <SubjectOverviewHeaderRow
        subject={vm.subject}
        currentCount={vm.count}
        onCountChange={(n) => onRecommendedCountChange(vm.subject.id, n)}
      />
      {!vm.hasItems ? (
        <div
          className="subject-overview-item flex flex-row items-start gap-1.5 px-3 py-2 rounded-lg border border-[#e1e4e8] bg-transparent cursor-pointer select-none transition-[background,border-color] duration-150 text-left"
          data-subject={vm.subject.id}
        >
          単元なし
        </div>
      ) : (
        vm.groups.map((group) => (
          <div
            key={`${group.topCatId}::${group.parentCatId}`}
            className="subject-overview-cat-group flex flex-col gap-0.5 mt-0.5"
          >
            <CategoryGroupHeader group={group} />
            {group.items.map(({ recommended, stats }) => (
              <RecommendedUnitCard
                key={recommended.id}
                subjectId={vm.subject.id}
                recommended={recommended}
                stats={stats}
                onActivate={() => onSelectUnit(vm.subject.id, recommended.id, recommended.name)}
              />
            ))}
          </div>
        ))
      )}
    </div>
  );
}

function SubjectOverviewHeaderRow({
  subject,
  currentCount,
  onCountChange,
}: {
  subject: SubjectInfo;
  currentCount: number;
  onCountChange: (n: number) => void;
}): React.JSX.Element {
  return (
    <div className="subject-overview-subject-row flex items-center gap-[5px] pt-1 px-1 pb-0.5 pl-0.5">
      <span className="subject-overview-icon text-lg leading-none shrink-0">{subject.icon}</span>
      <span className="subject-overview-name text-sm font-bold text-[#24292e]">{subject.name}</span>
      <div className="subject-rec-count-controls flex items-center gap-0.5 ml-auto">
        <span className="subject-rec-count-label text-[11px] text-[#586069] mr-0.5">目標数:</span>
        {RECOMMENDED_COUNT_OPTIONS.map((n) => {
          const active = currentCount === n;
          return (
            <button
              key={n}
              type="button"
              className={[
                "overall-rec-count-btn",
                "text-xs px-2 py-0.5 border border-[#d1d5da] rounded bg-transparent text-[#24292e] cursor-pointer",
                "transition-[background,border-color] duration-150",
                "hover:bg-[#e8f0fe] hover:border-[#0366d6]",
                "[&.active]:bg-[#0366d6] [&.active]:border-[#0366d6] [&.active]:text-white",
                active ? "active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={active}
              onClick={() => onCountChange(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryGroupHeader({
  group,
}: {
  group: { topCatId: string; topCatName: string; parentCatId: string; parentCatName: string };
}): React.JSX.Element | null {
  if (!group.parentCatId) return null;
  const showTop = group.topCatId && group.topCatId !== group.parentCatId;
  return (
    <div className="subject-overview-cat-header text-[11px] text-[#586069] px-0.5 pb-px">
      {showTop && (
        <>
          <span className="subject-overview-outer-cat font-semibold text-[#444d56]">{group.topCatName}</span>
          <span className="subject-overview-cat-header-arrow text-[#a0a0a0] mx-0.5"> › </span>
        </>
      )}
      <span className="subject-overview-outer-cat font-semibold text-[#444d56]">{group.parentCatName}</span>
    </div>
  );
}

function RecommendedUnitCard({
  subjectId,
  recommended,
  stats,
  onActivate,
}: {
  subjectId: string;
  recommended: RecommendedItem;
  stats: UnitStats;
  onActivate: () => void;
}): React.JSX.Element {
  const isAllMastered = stats.total > 0 && stats.mastered === stats.total;
  const statusEmoji = isAllMastered ? "✅" : stats.isStudying ? "🔄" : "⬜";
  const { masteredPct, inProgressPct } = calcDualProgressPct(stats.mastered, stats.inProgressCount, stats.total);
  const gradeClassName = recommended.referenceGrade ? gradeColorClass(recommended.referenceGrade) : "";
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onActivate();
    }
  };
  return (
    <div
      className="subject-overview-item flex flex-row items-start gap-1.5 px-3 py-2 rounded-lg border border-[#e1e4e8] bg-transparent cursor-pointer select-none transition-[background,border-color] duration-150 text-left hover:bg-[#e8f0fe] hover:border-[#0366d6] focus:outline-2 focus:outline-[#0366d6] focus:outline-offset-2"
      role="button"
      tabIndex={0}
      data-subject={subjectId}
      onClick={onActivate}
      onKeyDown={handleKeyDown}
    >
      <span className="subject-overview-status text-sm shrink-0 leading-none" aria-hidden="true">
        {statusEmoji}
      </span>
      <div className="subject-overview-name-area flex-1 min-w-0 flex flex-col gap-[3px]">
        <div className="subject-overview-title-row flex flex-row items-center gap-1.5 min-w-0 flex-wrap">
          <span className="subject-overview-rec-name text-base font-semibold min-w-0">{recommended.name}</span>
          {recommended.referenceGrade && (
            <span
              className={[
                "subject-overview-grade ml-auto shrink-0",
                "text-xs px-[5px] py-px rounded-[10px] whitespace-nowrap",
                "[&.grade-elementary]:text-[#c0392b] [&.grade-elementary]:bg-[#fde8e8]",
                "[&.grade-middle]:text-[#0366d6] [&.grade-middle]:bg-[#e8f0fe]",
                "[&.grade-high]:text-[#1a7f37] [&.grade-high]:bg-[#e8f8f0]",
                gradeClassName,
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {recommended.referenceGrade}
            </span>
          )}
        </div>
        <div className="subject-overview-progress-row flex items-center gap-1.5 min-w-0">
          <div className="subject-overview-progress-bar flex-1 h-1 bg-[#e1e4e8] rounded-sm overflow-hidden flex">
            <div
              className="subject-overview-progress-fill h-full bg-[#28a745] rounded-sm shrink-0"
              style={{ width: `${masteredPct}%` }}
            />
            <div
              className="subject-overview-progress-fill-inprogress h-full bg-[#f0a800] rounded-sm shrink-0"
              style={{ width: `${inProgressPct}%` }}
            />
          </div>
          {stats.total > 0 && (stats.mastered > 0 || stats.inProgressCount > 0) && (
            <span className="subject-overview-pct text-[11px] text-[#586069] whitespace-nowrap shrink-0">
              {stats.inProgressCount > 0
                ? `${stats.mastered}(${stats.inProgressCount})/${stats.total}`
                : `${stats.mastered}/${stats.total}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
