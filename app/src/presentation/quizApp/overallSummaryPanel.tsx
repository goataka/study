/**
 * 総合タブ用サマリパネルの描画ヘルパー群。
 *
 * - 教科ごとの学習状況サマリ
 * - 活動日付ラベル
 * - 今日の活動リスト
 * - 共有 URL タブの切り替え
 *
 * 全関数とも純粋な DOM 操作で、状態は引数として受け取る。
 */

import type { QuizRecord, QuizUseCase } from "../../application/quizUseCase";
import { SUBJECTS } from "../uiHelpers";
import { filterRecordsBySelectedDate } from "../shareSummary";
import { setActiveOverallPanel } from "../components/startScreen/panelTabsStore";
import { HistoryList } from "./HistoryList";
import { renderReactInto } from "./reactMount";

/**
 * 総合タブの「学習状況」を描画する。
 * 教科ごとの目標数に対する学習数とメッセージを表示する。
 */
export function renderOverallSubjectStatus(useCase: QuizUseCase, subjectRecommendedCounts: Map<string, number>): void {
  const container = document.getElementById("overallSubjectStatusSummary");
  if (!container) return;
  const subjects = SUBJECTS.filter((s) => !["all", "admin", "progress"].includes(s.id));
  const rows = subjects.map((subject) => buildOverallStatusRow(useCase, subject, subjectRecommendedCounts));
  renderReactInto(container, <OverallSubjectStatusSummary rows={rows} />);
}

interface OverallStatusRow {
  key: string;
  text: string;
}

function buildOverallStatusRow(
  useCase: QuizUseCase,
  subject: { id: string; name: string; icon: string },
  subjectRecommendedCounts: Map<string, number>,
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
  const target = Math.max(1, Math.min(subjectRecommendedCounts.get(subject.id) ?? 0, totalUnits));
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
 * ⭐ = 学習中、🏆 = 完了。
 */
export function updateActivityDateDisplay(useCase: QuizUseCase, selectedActivityDate: string): void {
  const el = document.getElementById("overallActivityDateLabel");
  if (!el) return;
  const records = useCase.getHistory();
  const selectedDateRecords = filterRecordsBySelectedDate(records, selectedActivityDate);
  // 選択日付にやった単元数をユニークカウント（unit ごとに集計）
  const unitKeys = new Set(selectedDateRecords.map((r) => `${r.subject}::${r.category}`));
  let masteredCount = 0;
  let studiedCount = 0;
  for (const key of unitKeys) {
    const sepIdx = key.indexOf("::");
    const subj = key.slice(0, sepIdx);
    const cat = key.slice(sepIdx + 2);
    // category="all" は集計用の特殊カテゴリで個別の単元ではないためスキップする
    if (cat === "all") continue;
    const { mastered, total } = useCase.getMasteredCountForCategory(subj, cat);
    // 問題数が 0 の場合（カテゴリが削除済み等）はスキップする
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
 *
 * ストアを更新することで `<OverallSummaryPanel>` が再レンダリングし、
 * active クラス・aria-selected・各サブパネルの hidden が宣言的に更新される。
 * 後方互換のため、React 未マウントのテスト向けに命令的な classList 操作も併用する。
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
 * `selectedActivityDate` の日付と一致するクイズ記録を履歴と同じ形式で表示する。
 */
export function renderTodayActivity(records: QuizRecord[], useCase: QuizUseCase, selectedActivityDate: string): void {
  const container = document.getElementById("todayActivityContent");
  if (!container) return;

  const todayRecords = filterRecordsBySelectedDate(records, selectedActivityDate);
  // 最新順に並べて履歴形式で表示（総合タブなので教科名プレフィックスを付ける）
  const sorted = [...todayRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  renderReactInto(
    container,
    <HistoryList
      records={sorted}
      useCase={useCase}
      showSubjectPrefix
      emptyMessage="この日はまだ問題を解いていません。"
      emptyClassName="today-activity-empty"
    />,
  );
}
