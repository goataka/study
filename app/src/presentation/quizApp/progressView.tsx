/**
 * 進度タブの左パネル（教科リスト）を描画するヘルパー（React 版）。
 *
 * 教科ごとの「学習済み単元数 / 総単元数」を表示し、クリックで教科切り替え。
 */

import type { QuizUseCase } from "../../application/quizUseCase";
import { SUBJECTS } from "../uiHelpers";
import { setActiveProgressDetailMode } from "../components/startScreen/panelTabsStore";
import { renderReactInto } from "./reactMount";
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
  return contentSubjects.map((subj) => {
    const allCats = useCase.getCategoriesForSubject(subj.id);
    const catIds = Object.keys(allCats);
    let masteredUnitCount = 0;
    for (const catId of catIds) {
      const { mastered, total } = useCase.getMasteredCountForCategory(subj.id, catId);
      if (total > 0 && mastered === total) masteredUnitCount++;
    }
    return { id: subj.id, name: subj.name, icon: subj.icon, mastered: masteredUnitCount, total: catIds.length };
  });
}

/**
 * 進度タブ左パネル用の教科リストを指定コンテナへ React で描画する。
 */
export function renderProgressSubjectList(
  container: Element,
  useCase: QuizUseCase,
  callbacks: ProgressSubjectListCallbacks,
): void {
  const stats = buildProgressSubjectStats(useCase);
  renderReactInto(container, <ProgressSubjectList stats={stats} callbacks={callbacks} />);
}

// ─── React コンポーネント ────────────────────────────────────────────────

interface ProgressSubjectListProps {
  stats: ProgressSubjectStats[];
  callbacks: ProgressSubjectListCallbacks;
}

function ProgressSubjectList({ stats, callbacks }: ProgressSubjectListProps): React.JSX.Element {
  return (
    <div className="progress-subject-list flex flex-col gap-1.5 p-0">
      {stats.map((s) => (
        <ProgressSubjectListItem key={s.id} stat={s} callbacks={callbacks} />
      ))}
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
  return (
    <button
      type="button"
      className={[
        "progress-subject-list-item",
        "flex flex-row items-center gap-2 px-3 py-[10px] rounded-lg border border-[#e1e4e8] bg-white",
        "cursor-pointer select-none transition-[background,border-color] duration-150 text-left w-full",
        "hover:bg-[#e8f0fe] hover:border-[#0366d6]",
        "focus:outline-2 focus:outline-[#0366d6] focus:outline-offset-2",
        "[&.active]:bg-[#e8f0fe] [&.active]:border-[#0366d6] [&.active]:font-semibold",
        isActive ? "active" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={isActive}
      data-subject={stat.id}
      onClick={() => callbacks.onSelectSubject(stat.id)}
    >
      <span className="progress-subject-list-icon text-lg shrink-0 leading-none" aria-hidden="true">
        {stat.icon}
      </span>
      <div className="progress-subject-list-name-area flex-1 min-w-0 flex flex-col gap-[3px]">
        <span className="progress-subject-list-name text-[15px] font-semibold text-[#24292e] break-words">
          {stat.name}
        </span>
        <span className="progress-subject-list-stats text-xs text-[#586069]">{`${stat.mastered} / ${stat.total} 単元`}</span>
      </div>
    </button>
  );
}

// ─── 既存の syncProgressDetailControls はそのまま（DOM トグルのみで React 不要） ──

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
}
