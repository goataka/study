/**
 * ヘッダーに表示する「今日の日付」を更新するヘルパー。
 * QuizApp の状態には依存しない、純粋な DOM 操作関数。
 */

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/**
 * 今日の日付を「YYYY/MM/DD（曜日）」形式で `#headerTodayDate` と `#quizTabDate` に表示する。
 */
export function updateHeaderTodayDate(now: Date = new Date()): void {
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const w = WEEKDAYS[now.getDay()];
  const text = `${yyyy}/${mm}/${dd}（${w}）`;

  const el = document.getElementById("headerTodayDate");
  if (el) el.textContent = text;
  const elQuiz = document.getElementById("quizTabDate");
  if (elQuiz) elQuiz.textContent = text;
}
