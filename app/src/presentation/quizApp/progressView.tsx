/**
 * 進度タブの左パネル（教科リスト）を描画するヘルパー（React 版）。
 *
 * 教科ごとの「学習済み単元数 / 総単元数」を表示し、クリックで教科切り替え。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import { useEffect, useRef, useState } from "react";
import { SUBJECTS } from "../uiHelpers";
import { setActiveProgressDetailMode } from "../components/startScreen/panelTabsStore";
import { setProgressDetailPanelHidden } from "../components/startScreen/panelVisibilityStore";
import { categoryListContentStore } from "../components/categoryListContentStore";
import type { ProgressStatusFilter } from "./urlStateService";

/** 進度タブ教科リストのコールバック群。 */
export interface ProgressSubjectListCallbacks {
  /** 現在選択中の教科 ID。アクティブ表示の判定に使う。 */
  currentSubjectId: string;
  /** 教科切り替え時に呼ばれる。 */
  onSelectSubject: (subjectId: string) => void;
}

interface ProgressSubjectStats {
  id: string;
  name: string;
  icon: string;
  mastered: number;
  total: number;
}

/**
 * 教科ごとの「全問習得済みの単元数 / 総単元数」を集計する純粋関数。
 */
export function buildProgressSubjectStats(useCase: QuizUseCase): ProgressSubjectStats[] {
  const contentSubjects = SUBJECTS.filter((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress");
  return buildProgressSubjectStatsWithGradeFilter(useCase, null, contentSubjects);
}

function buildProgressSubjectStatsWithGradeFilter(
  useCase: QuizUseCase,
  gradeFilterPrefix: "小学" | "中学" | "高校" | null,
  contentSubjects: Array<{ id: string; name: string; icon: string }>,
): ProgressSubjectStats[] {
  return contentSubjects.map((subj) => {
    const allCats = useCase.getCategoriesForSubject(subj.id);
    const catIds = Object.keys(allCats).filter((catId) => {
      if (gradeFilterPrefix === null) return true;
      const grade = useCase.getCategoryReferenceGrade(subj.id, catId);
      return grade?.startsWith(gradeFilterPrefix) ?? false;
    });
    let masteredUnitCount = 0;
    for (const catId of catIds) {
      const { mastered, total } = useCase.getMasteredCountForCategory(subj.id, catId);
      if (total > 0 && mastered === total) masteredUnitCount++;
    }
    return { id: subj.id, name: subj.name, icon: subj.icon, mastered: masteredUnitCount, total: catIds.length };
  });
}

/**
 * 進度タブ左パネル用の教科リストをカテゴリリストストアへ描画する。
 */
export function renderProgressSubjectList(
  _container: Element,
  useCase: QuizUseCase,
  callbacks: ProgressSubjectListCallbacks,
  gradeFilterPrefix: "小学" | "中学" | "高校" | null,
): void {
  const contentSubjects = SUBJECTS.filter((s) => s.id !== "all" && s.id !== "admin" && s.id !== "progress");
  const stats = buildProgressSubjectStatsWithGradeFilter(useCase, gradeFilterPrefix, contentSubjects);
  categoryListContentStore.set(<ProgressSubjectList stats={stats} callbacks={callbacks} />);
}

// ─── React コンポーネント ────────────────────────────────────────────────

interface ProgressSubjectListProps {
  stats: ProgressSubjectStats[];
  callbacks: ProgressSubjectListCallbacks;
}

function ProgressSubjectList({ stats, callbacks }: ProgressSubjectListProps): React.JSX.Element {
  return (
    <div className="progress-subject-list flex flex-col gap-0.5">
      {stats.map((s) => (
        <ProgressSubjectListItem key={s.id} stat={s} callbacks={callbacks} />
      ))}
    </div>
  );
}

function ProgressCompletionRuleInfo(): React.JSX.Element {
  const [showInfo, setShowInfo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonId = "progressCompletionRuleInfoBtn";

  useEffect(() => {
    if (!showInfo) return;
    const handlePointerDown = (event: PointerEvent): void => {
      if (containerRef.current && event.target instanceof Node && !containerRef.current.contains(event.target)) {
        setShowInfo(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setShowInfo(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showInfo]);

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        id={buttonId}
        type="button"
        className="flex h-5 w-5 items-center justify-center rounded-full border border-[#d0d7de] bg-white text-[11px] leading-none text-[#586069] hover:bg-[#f6f8fa] hover:text-[#0366d6]"
        aria-label="学習完了ルールの説明を表示"
        aria-expanded={showInfo}
        onClick={(event) => {
          event.stopPropagation();
          setShowInfo((value) => !value);
        }}
      >
        ℹ️
      </button>
      {showInfo ? (
        <div
          id="progressCompletionRuleInfoPopover"
          className="absolute right-0 top-full z-50 mt-1 w-72 rounded-md border border-[#e1e4e8] bg-white p-3 text-sm text-[#24292e] shadow-lg"
          role="region"
          aria-labelledby={buttonId}
          aria-live="polite"
        >
          <p className="m-0 font-semibold">学習完了の条件</p>
          <p className="m-0 mt-1 leading-relaxed">全問題がステージ3になると学習完了となります。</p>
        </div>
      ) : null}
    </div>
  );
}

function ProgressSubjectListItem({
  stat,
  callbacks,
}: {
  stat: ProgressSubjectStats;
  callbacks: ProgressSubjectListCallbacks;
}): React.JSX.Element {
  const isActive = stat.id === callbacks.currentSubjectId;
  const isMastered = stat.total > 0 && stat.mastered === stat.total;
  const isInProgress = !isMastered && stat.mastered > 0;
  const statusIcon = isMastered ? "✅" : isInProgress ? "🟨" : "⬜";
  const masteredPct = stat.total > 0 ? Math.round((stat.mastered / stat.total) * 100) : 0;
  const selectSubject = (): void => callbacks.onSelectSubject(stat.id);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectSubject();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className={[
        "progress-subject-list-item",
        "category-item flex w-full cursor-pointer select-none rounded-md text-left transition-[background,border-color] duration-150",
        "hover:bg-[#e8f0fe]",
        "focus:outline-2 focus:outline-[#0366d6] focus:outline-offset-2",
        "[&.active]:bg-[#e8f0ff] [&.active]:text-[#0366d6]",
        "group",
        isActive ? "active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={isActive}
      data-subject={stat.id}
      onClick={selectSubject}
      onKeyDown={handleKeyDown}
    >
      <div className="category-item-left flex min-w-0 flex-1 items-center gap-2 py-[7px] pl-[10px] pr-[14px]">
        <span className="category-status text-sm shrink-0 leading-none" aria-hidden="true">
          {statusIcon}
        </span>
        <div className="category-name-area flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="category-title-row flex min-w-0 items-center gap-1.5">
            <span className="progress-subject-list-icon text-[19px] shrink-0 leading-none" aria-hidden="true">
              {stat.icon}
            </span>
            <span className="progress-subject-list-name text-lg font-semibold text-[#24292e] group-[.active]:text-[#0366d6] break-words">
              {stat.name}
            </span>
            {isActive ? <ProgressCompletionRuleInfo /> : null}
          </div>
          <div className="category-progress-row flex items-center gap-1.5">
            <div className="category-progress-bar flex h-1 min-w-0 flex-1 overflow-hidden rounded-sm bg-[#e1e4e8]">
              <div
                className="category-progress-fill h-full bg-[#28a745] rounded-sm shrink-0"
                style={{ width: `${masteredPct}%` }}
              />
            </div>
            <span className="progress-subject-list-stats text-[13px] text-[#586069] whitespace-nowrap shrink-0 group-[.active]:text-[#0366d6]/85">
              {`${stat.mastered}/${stat.total}`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 既存の syncProgressDetailControls はそのまま（DOM トグルのみで React 不要） ──

/**
 * 進度詳細パネルのタブ・フィルターボタンの状態を反映する（コンテンツ本体は別関数で描画）。
 */
export function syncProgressDetailControls(
  progressDetailViewMode: "grade" | "category" | "matrix",
  progressStatusFilter: ProgressStatusFilter,
  progressGradeFilter: "小学" | "中学" | "高校" | null,
): void {
  const panel = document.getElementById("progressDetailPanel");
  if (!panel) return;
  setProgressDetailPanelHidden(false);
  panel.classList.remove("hidden");

  // タブ active 状態は React コンポーネントが panelTabsStore を購読して反映する。
  // 後方互換のため、React 未マウントのテスト環境向けに命令的 DOM 更新も併用する。
  setActiveProgressDetailMode(progressDetailViewMode);

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

  const gradeButtons: Array<{ id: string; grade: "小学" | "中学" | "高校" | null }> = [
    { id: "progressGradeAllBtn", grade: null },
    { id: "progressGradeAllBtnSide", grade: null },
    { id: "progressGradeElemBtn", grade: "小学" },
    { id: "progressGradeElemBtnSide", grade: "小学" },
    { id: "progressGradeMiddleBtn", grade: "中学" },
    { id: "progressGradeMiddleBtnSide", grade: "中学" },
    { id: "progressGradeHighBtn", grade: "高校" },
    { id: "progressGradeHighBtnSide", grade: "高校" },
  ];
  gradeButtons.forEach(({ id, grade }) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const active = progressGradeFilter === grade;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  });
}
