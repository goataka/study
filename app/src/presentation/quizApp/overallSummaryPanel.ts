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
import { buildHistoryItem } from "../historyItemView";

/**
 * 総合タブの「学習状況」を描画する。
 * 教科ごとの目標数に対する学習数とメッセージを表示する。
 */
export function renderOverallSubjectStatus(useCase: QuizUseCase, subjectRecommendedCounts: Map<string, number>): void {
  const container = document.getElementById("overallSubjectStatusSummary");
  if (!container) return;
  container.innerHTML = "";
  const subjects = SUBJECTS.filter((s) => !["all", "admin", "progress"].includes(s.id));
  for (const subject of subjects) {
    const categories = useCase.getCategoriesForSubject(subject.id);
    const totalUnits = Object.keys(categories).length;
    const studiedUnitCount = Object.keys(categories).filter((categoryId) => {
      const { mastered } = useCase.getMasteredCountForCategory(subject.id, categoryId);
      const inProgress = useCase.getInProgressCount({ subject: subject.id, category: categoryId });
      return mastered > 0 || inProgress > 0;
    }).length;
    if (totalUnits === 0) {
      const row = document.createElement("div");
      row.className = "overall-subject-status-row";
      row.textContent = `${subject.icon} ${subject.name}: 0/0単元 🌱 まずは単元を追加しよう！`;
      container.appendChild(row);
      continue;
    }
    const target = Math.max(1, Math.min(subjectRecommendedCounts.get(subject.id) ?? 0, totalUnits));
    const ratio = Math.min(1, studiedUnitCount / target);
    const message =
      ratio >= 1
        ? "🎉 目標達成！この調子！"
        : ratio >= 0.5
          ? "👍 いい感じで進んでいるよ！"
          : "🌱 まずは1単元ずつ進めよう！";
    const row = document.createElement("div");
    row.className = "overall-subject-status-row";
    row.textContent = `${subject.icon} ${subject.name}: ${Math.min(studiedUnitCount, target)}/${target}単元 ${message}`;
    container.appendChild(row);
  }
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
    const { mastered, total } = useCase.getMasteredCountForCategory(subj, cat);
    if (total > 0 && mastered === total) {
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

  container.innerHTML = "";

  if (todayRecords.length === 0) {
    const empty = document.createElement("p");
    empty.className = "today-activity-empty";
    empty.textContent = "この日はまだ問題を解いていません。";
    container.appendChild(empty);
    return;
  }

  // 最新順に並べて履歴形式で表示（総合タブなので教科名プレフィックスを付ける）
  const sorted = [...todayRecords].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  sorted.forEach((record) => {
    container.appendChild(buildHistoryItem(record, useCase, true));
  });
}
