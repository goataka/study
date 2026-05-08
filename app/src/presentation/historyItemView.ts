/**
 * 履歴アイテム DOM 構築関数。
 *
 * QuizApp から肥大化していた `buildHistoryItem` を切り出したもの。
 * `useCase` の `getQuestionById` のみに依存する。
 */

import type { QuizUseCase, QuizRecord } from "../application/quizUseCase";
import { NO_ANSWER_TEXT } from "../application/quizUseCase";
import { shuffleChoices } from "../domain/question";

/**
 * クイズ履歴 1 件分の表示要素を生成する。折りたたみ可能なヘッダー＋詳細を構築する。
 *
 * @param record 履歴レコード
 * @param useCase 問題情報取得に使用するユースケース
 * @param showSubjectPrefix true のとき教科名・カテゴリ名のプレフィックス表示と時刻のみの日付表示にする（総合タブ用）
 */
export function buildHistoryItem(record: QuizRecord, useCase: QuizUseCase, showSubjectPrefix = false): HTMLElement {
  const item = document.createElement("div");
  item.className = "history-item";

  // ヘッダー行（日時・教科・スコア）
  const header = document.createElement("div");
  header.className = "history-item-header";
  header.setAttribute("role", "button");
  header.setAttribute("tabindex", "0");
  header.setAttribute("aria-expanded", "false");

  const date = new Date(record.date);
  // 総合タブの実施済み単元リストでは時刻のみ表示する
  const dateStr = showSubjectPrefix
    ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    : `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  const isManual = record.mode === "manual";
  const pct = Math.round((record.correctCount / record.totalCount) * 100);

  const metaDiv = document.createElement("div");
  metaDiv.className = "history-meta";

  const dateSpan = document.createElement("span");
  dateSpan.className = "history-date";
  dateSpan.textContent = dateStr;

  const subjectSpan = document.createElement("span");
  subjectSpan.className = "history-subject";
  subjectSpan.textContent = showSubjectPrefix ? `${record.subjectName} / ${record.categoryName}` : record.categoryName;

  metaDiv.appendChild(dateSpan);
  metaDiv.appendChild(subjectSpan);

  const scoreSpan = document.createElement("span");
  if (isManual) {
    scoreSpan.className = "history-score";
    scoreSpan.textContent = "-";
  } else {
    scoreSpan.className = `history-score ${pct >= 70 ? "pass" : "fail"}`;
    scoreSpan.textContent = `${record.correctCount}/${record.totalCount} (${pct}%)`;
  }

  header.appendChild(metaDiv);
  header.appendChild(scoreSpan);

  // 詳細（折りたたみ）
  const detail = document.createElement("div");
  detail.className = "history-detail hidden";

  if (isManual) {
    // 手動確認済みの記録は詳細を展開できない
    header.removeAttribute("role");
    header.removeAttribute("tabindex");
    header.removeAttribute("aria-expanded");
  } else {
    const toggleSpan = document.createElement("span");
    toggleSpan.className = "history-toggle";
    toggleSpan.textContent = "▶";
    header.appendChild(toggleSpan);

    record.entries.forEach((entry) => {
      const entryDiv = document.createElement("div");
      entryDiv.className = `history-entry ${entry.isCorrect ? "correct" : "incorrect"}`;

      const iconSpan = document.createElement("span");
      iconSpan.className = "history-entry-icon";
      iconSpan.textContent = entry.isCorrect ? "✓" : "✗";

      const contentDiv = document.createElement("div");
      contentDiv.className = "history-entry-content";

      const question = useCase.getQuestionById(entry.questionId);

      const questionP = document.createElement("p");
      questionP.className = "history-entry-question";

      const answerP = document.createElement("p");
      answerP.className = "history-entry-answer";

      if (question) {
        const shuffled = shuffleChoices(question);
        questionP.textContent = question.question;
        const userAnswer =
          entry.userAnswerText ??
          entry.userAnswerChoiceText ??
          shuffled.choices[entry.userAnswerIndex] ??
          NO_ANSWER_TEXT;
        const correctAnswer = entry.correctAnswerText ?? shuffled.choices[shuffled.correct] ?? "";
        if (entry.isCorrect) {
          answerP.textContent = `正解: ${correctAnswer}`;
        } else {
          answerP.textContent = `あなたの回答: ${userAnswer} → 正解: ${correctAnswer}`;
        }
      } else {
        questionP.textContent = `(問題ID: ${entry.questionId})`;
        answerP.textContent = entry.isCorrect ? "正解" : "不正解";
      }

      contentDiv.appendChild(questionP);
      contentDiv.appendChild(answerP);
      entryDiv.appendChild(iconSpan);
      entryDiv.appendChild(contentDiv);
      detail.appendChild(entryDiv);
    });

    // 折りたたみ切り替え
    const toggleDetail = (): void => {
      const isExpanded = !detail.classList.contains("hidden");
      detail.classList.toggle("hidden", isExpanded);
      toggleSpan.textContent = isExpanded ? "▶" : "▼";
      header.setAttribute("aria-expanded", String(!isExpanded));
    };

    header.addEventListener("click", toggleDetail);
    header.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleDetail();
      }
    });
  }

  item.appendChild(header);
  item.appendChild(detail);
  return item;
}
