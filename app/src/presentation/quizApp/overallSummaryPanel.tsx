/**
 * 総合タブ用サマリパネルの描画ヘルパー群。
 *
 * - 活動日付ラベル（後方互換のため保持）
 * - 学習状況の星表示（開始するボタン＋目標数に応じた☆/⭐/✨/🌟）
 * - 教科ごとの学習状況サマリ（後方互換）
 * - 今日の活動リスト（後方互換）
 * - 共有 URL タブの切り替え
 *
 * 全関数とも純粋な DOM 操作で、状態は引数として受け取る。
 */

import type { QuizRecord, QuizUseCase } from "../../application/quizUseCase";
import { SUBJECTS } from "../uiHelpers";
import { filterRecordsBySelectedDate } from "../shareSummary";
import { setActiveOverallPanel } from "../components/startScreen/panelTabsStore";
import { HistoryList } from "./HistoryList";
import { overallStatusContentStore } from "../components/overallStatusContentStore";
import { todayActivityContentStore } from "../components/todayActivityContentStore";
import { learningStatusContentStore } from "../components/learningStatusContentStore";
import { triggerStartQuiz } from "../components/learningStatusActionsStore";

/**
 * 総合タブの「学習状況」を描画する（後方互換用）。
 */
export function renderOverallSubjectStatus(useCase: QuizUseCase, globalRecommendedCount: number): void {
  const subjects = SUBJECTS.filter((s) => !["all", "admin", "progress"].includes(s.id));
  const rows = subjects.map((subject) => buildOverallStatusRow(useCase, subject, globalRecommendedCount));
  overallStatusContentStore.set(<OverallSubjectStatusSummary rows={rows} />);
}

interface OverallStatusRow {
  key: string;
  text: string;
}

function buildOverallStatusRow(
  useCase: QuizUseCase,
  subject: { id: string; name: string; icon: string },
  globalRecommendedCount: number,
): OverallStatusRow {
  const categories = useCase.getCategoriesForSubject(subject.id);
  const totalUnits = Object.keys(categories).length;
  if (totalUnits === 0) {
    return {
      key: subject.id,
      text: `${subject.icon} ${subject.name}: 0/0単元 🌱 まずは単元を追加しよう！`,
    };
  }
  const studiedOrInProgressUnitCount = Object.keys(categories).filter((categoryId) => {
    const { mastered } = useCase.getMasteredCountForCategory(subject.id, categoryId);
    const inProgress = useCase.getInProgressCount({ subject: subject.id, category: categoryId });
    return mastered > 0 || inProgress > 0;
  }).length;
  const target = Math.max(1, Math.min(globalRecommendedCount, totalUnits));
  const ratio = Math.min(1, studiedOrInProgressUnitCount / target);
  const message =
    ratio >= 1
      ? "🎉 目標達成！この調子！"
      : ratio >= 0.5
        ? "👍 いい感じで進んでいるよ！"
        : "🌱 まずは1単元ずつ進めよう！";
  return {
    key: subject.id,
    text: `${subject.icon} ${subject.name}: ${Math.min(studiedOrInProgressUnitCount, target)}/${target}単元 ${message}`,
  };
}

function OverallSubjectStatusSummary({ rows }: { rows: OverallStatusRow[] }): React.JSX.Element {
  return (
    <>
      {rows.map((row) => (
        <div key={row.key} className="overall-subject-status-row text-sm text-[#24292e] py-0.5">
          {row.text}
        </div>
      ))}
    </>
  );
}

/**
 * 活動ラベル `#overallActivityDateLabel` を本日実施した単元数に更新する。
 */
export function updateActivityDateDisplay(useCase: QuizUseCase, selectedActivityDate: string): void {
  const el = document.getElementById("overallActivityDateLabel");
  if (!el) return;
  const records = useCase.getHistory();
  const selectedDateRecords = filterRecordsBySelectedDate(records, selectedActivityDate);
  const unitKeys = new Set(selectedDateRecords.map((r) => `${r.subject}::${r.category}`));
  let masteredCount = 0;
  let studiedCount = 0;
  for (const key of unitKeys) {
    const sepIdx = key.indexOf("::");
    const subj = key.slice(0, sepIdx);
    const cat = key.slice(sepIdx + 2);
    if (cat === "all") continue;
    const { mastered, total } = useCase.getMasteredCountForCategory(subj, cat);
    if (total === 0) continue;
    if (mastered === total) {
      masteredCount++;
    } else {
      studiedCount++;
    }
  }
  const symbols = "🏆".repeat(Math.min(masteredCount, 5)) + "⭐".repeat(Math.min(studiedCount, 5));
  el.textContent = `学習数：${symbols}`;
}

/**
 * 総合タブのサマリパネルタブ（学習済み / シェア）を切り替える。
 */
export function showOverallPanel(tab: "learned" | "share"): void {
  setActiveOverallPanel(tab);

  document.getElementById("overallLearnedPanel")?.classList.toggle("hidden", tab !== "learned");
  document.getElementById("overallSharePanel")?.classList.toggle("hidden", tab !== "share");

  document.querySelectorAll<HTMLElement>(".panel-tab[data-overall-panel]").forEach((t) => {
    const isActive = t.dataset.overallPanel === tab;
    t.classList.toggle("active", isActive);
    t.setAttribute("aria-selected", String(isActive));
  });
}

/**
 * 今日の活動セクションを描画する。
 */
export function renderTodayActivity(records: QuizRecord[], useCase: QuizUseCase, selectedActivityDate: string): void {
  const todayRecords = filterRecordsBySelectedDate(records, selectedActivityDate);
  const sorted = [...todayRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  todayActivityContentStore.set(
    <HistoryList
      records={sorted}
      useCase={useCase}
      showSubjectPrefix
      emptyMessage="この日はまだ問題を解いていません。"
      emptyClassName="today-activity-empty"
    />,
  );
}

/**
 * 学習状況パネルに「開始する」ボタンと星表示を描画する。
 *
 * 星ロジック（G = 目標数、n = 今日の完了数）:
 * - n < G: ⭐×n + ☆×(G-n)
 * - n >= G: 🌟×floor(n/(2*G)) + ✨×(floor(n/G)%2) + ⭐×(n%G)
 * - 合計 10 個を超える場合は「…」を付加
 */
export function renderLearningStatusStars(useCase: QuizUseCase, goalCount: number): void {
  const completedToday = useCase.getTodayAdvancedCount();
  const [firstRecommended] = useCase.getRecommendedUnitsGlobal(goalCount, Math.max(2, Math.ceil(goalCount / 2)));
  const firstRecommendedTitle = firstRecommended
    ? `${SUBJECTS.find((s) => s.id === firstRecommended.subject)?.name ?? firstRecommended.subject}：${firstRecommended.categoryName}`
    : "";
  learningStatusContentStore.set(
    <LearningStatusPanel
      goalCount={goalCount}
      completedToday={completedToday}
      firstRecommendedTitle={firstRecommendedTitle}
    />,
  );
}

// ─── 星表示コンポーネント ──────────────────────────────────────────────────

function buildStarItems(G: number, n: number): Array<{ symbol: string; className: string }> {
  const items: Array<{ symbol: string; className: string }> = [];
  if (G <= 0) return items;

  if (n < G) {
    for (let i = 0; i < n; i++) items.push({ symbol: "⭐", className: "text-3xl" });
    for (let i = n; i < G; i++) items.push({ symbol: "☆", className: "text-3xl text-[#c5ced8]" });
  } else {
    const fullSets = Math.floor(n / G);
    const partial = n % G;
    const bigStars = Math.floor(fullSets / 2);
    const sparkles = fullSets % 2;

    for (let i = 0; i < bigStars; i++) items.push({ symbol: "🌟", className: "text-4xl" });
    for (let i = 0; i < sparkles; i++) items.push({ symbol: "✨", className: "text-3xl" });
    for (let i = 0; i < partial; i++) items.push({ symbol: "⭐", className: "text-3xl" });
  }
  return items;
}

function LearningStatusPanel({
  goalCount,
  completedToday,
  firstRecommendedTitle,
}: {
  goalCount: number;
  completedToday: number;
  firstRecommendedTitle: string;
}): React.JSX.Element {
  const allItems = buildStarItems(goalCount, completedToday);
  const MAX_ITEMS = 10;
  const displayItems = allItems.slice(0, MAX_ITEMS);
  const hasMore = allItems.length > MAX_ITEMS;

  return (
    <div className="learning-status-panel flex flex-col gap-2 py-3 px-4">
      <div className="learning-status-stars-and-count flex flex-row flex-wrap items-center justify-center gap-2 min-h-[2.75rem]">
        <div
          id="learningStatusStars"
          className="learning-status-stars flex flex-row flex-wrap items-center justify-center gap-0.5"
        >
          {displayItems.map((item, idx) => (
            <span key={idx} className={`leading-none ${item.className}`}>
              {item.symbol}
            </span>
          ))}
          {hasMore && <span className="text-[#586069] text-sm">…</span>}
          {displayItems.length === 0 && <span className="text-sm text-[#8b949e]">☆</span>}
        </div>
        <span id="learningStatusCount" className="text-sm font-semibold text-[#24292e]">
          学習数 {Math.min(completedToday, goalCount)}/{goalCount}
        </span>
      </div>
      {firstRecommendedTitle && (
        <div id="learningStatusFirstTitle" className="text-sm text-[#586069] text-center">
          次のおすすめ: {firstRecommendedTitle}
        </div>
      )}
      <button
        id="learningStatusStartBtn"
        type="button"
        className="learning-status-start-btn w-full py-2.5 px-4 text-base font-bold text-white bg-[#0366d6] rounded-lg border-none cursor-pointer hover:bg-[#0255b3] active:bg-[#024ea0] transition-[background-color] duration-150 shadow-sm"
        onClick={triggerStartQuiz}
      >
        開始する
      </button>
    </div>
  );
}
