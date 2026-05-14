/**
 * クイズの開始・採点・結果画面表示のオーケストレーター（純粋関数）。
 *
 * セッション開始時のエラーハンドリング（全問学習済み確認ダイアログ）と
 * 採点後の画面更新を担う。`this` には依存せず、必要な依存は引数で受け取る。
 */

import {
  type QuizMode,
  type QuizFilter,
  type QuizUseCase,
  type AnswerResult,
  type QuizSession,
  ERROR_ALL_MASTERED,
} from "../../application/quizUseCase";
import { setResults } from "../components/resultStore";
import { scoreCircle } from "../styles/scoreCircleStyles";
import { buildUnitName } from "../uiHelpers";

/** クイズ開始時の依存。 */
export interface StartQuizDeps {
  useCase: QuizUseCase;
  effectiveFilter: QuizFilter;
  questionCount: number;
  includeMastered: boolean;
  quizOrder: "random" | "straight";
  showConfirmDialog: (message: string, alertOnly?: boolean) => Promise<boolean>;
  notifyError: (message: string) => void;
}

/**
 * `quizOrder === "straight"` でかつ `mode === "random"` の場合は内部的に
 * `"practice"` モード（登録順）にマップして返す。
 */
export function resolveEffectiveMode(mode: QuizMode, quizOrder: "random" | "straight"): QuizMode {
  return mode === "random" && quizOrder === "straight" ? "practice" : mode;
}

/** 同期的にセッション作成を試みた結果。 */
export type TryStartQuizOutcome =
  | { kind: "success"; session: QuizSession }
  | { kind: "all-mastered" }
  | { kind: "error"; message: string };

/**
 * 設定に基づいて新しいクイズセッションを同期的に試みる。
 * `ERROR_ALL_MASTERED` を捕捉した場合は `{ kind: "all-mastered" }` を返す
 * （呼び出し元で確認ダイアログを表示する想定）。
 */
export function tryStartQuizSession(effectiveMode: QuizMode, deps: StartQuizDeps): TryStartQuizOutcome {
  try {
    const session = deps.includeMastered
      ? deps.useCase.startSessionWithAllQuestions(effectiveMode, deps.effectiveFilter, deps.questionCount)
      : deps.useCase.startSession(effectiveMode, deps.effectiveFilter, deps.questionCount);
    return { kind: "success", session };
  } catch (error) {
    if (error instanceof Error && error.message === ERROR_ALL_MASTERED) {
      return { kind: "all-mastered" };
    }
    return { kind: "error", message: error instanceof Error ? error.message : "エラーが発生しました" };
  }
}

/**
 * 「全問学習済み」確認ダイアログ後に、全問題からランダム出題のセッションを作成する。
 *
 * @returns ユーザーがキャンセル／失敗した場合は `null`
 */
export async function confirmAndStartWithAllQuestions(deps: StartQuizDeps): Promise<QuizSession | null> {
  const confirmed = await deps.showConfirmDialog("すべての問題が学習済みです。全問題からランダムに出題しますか？");
  if (!confirmed) return null;
  try {
    // 全問出題時は常にランダム順で開始する
    return deps.useCase.startSessionWithAllQuestions("random", deps.effectiveFilter, deps.questionCount);
  } catch (innerError) {
    deps.notifyError(innerError instanceof Error ? innerError.message : "エラーが発生しました");
    return null;
  }
}

/** 採点とその後の更新を担う。 */
export interface SubmitQuizDeps {
  useCase: QuizUseCase;
  session: QuizSession;
  effectiveFilter: QuizFilter;
  currentMode: QuizMode;
  onAfterSubmit: () => void;
}

/**
 * 現在のセッションを採点して履歴に記録し、結果配列を返す。
 * 結果画面遷移の前にスタート画面を最新化するため `onAfterSubmit` を呼ぶ。
 */
export function submitQuizSession(deps: SubmitQuizDeps): AnswerResult[] {
  const results = deps.useCase.submitSession(deps.session);
  deps.useCase.addHistoryRecord(results, deps.effectiveFilter, deps.currentMode);
  deps.onAfterSubmit();
  return results;
}

/**
 * 結果画面を描画する。
 */
export function renderResultScreen(results: AnswerResult[]): void {
  setResults(results);
  applyLegacyResultDomForNonReactTests(results);
}

/**
 * #resultScreen が React によって管理されているかを判定する。
 * React 管理下では resultStore 経由で ResultScreen が自律的に描画するため、
 * legacy DOM 書き換えをすべてスキップする必要がある。
 */
function isResultScreenManagedByReact(): boolean {
  return document.getElementById("resultScreen")?.hasAttribute("data-react-managed") ?? false;
}

function applyLegacyResultDomForNonReactTests(results: AnswerResult[]): void {
  // React 管理下では ResultScreen コンポーネントが resultStore を通じて自律的に描画するため、
  // legacy DOM 書き換え（resultUnitName / resultMessage / scoreDisplay）をすべてスキップする。
  if (isResultScreenManagedByReact()) return;

  const resultUnitName = document.getElementById("resultUnitName");
  const resultMessage = document.getElementById("resultMessage");
  // `resultScore` は `setupTabDom` を使う QuizApp 単体テストのレガシーDOM ID 互換のため残す。
  const scoreDisplay = document.getElementById("scoreDisplay") ?? document.getElementById("resultScore");

  const unitName = buildUnitName(results[0]?.question);
  if (resultUnitName) {
    resultUnitName.textContent = unitName;
    resultUnitName.classList.toggle("hidden", unitName.length === 0);
  }

  const correctCount = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const isPerfect = total > 0 && correctCount === total;
  const result: "perfect" | "pass" | "fail" = isPerfect ? "perfect" : percentage >= 70 ? "pass" : "fail";
  const circleClass = scoreCircle({ result });
  if (resultMessage) {
    resultMessage.textContent =
      percentage === 100
        ? "🌟 満点！すごい！"
        : percentage >= 80
          ? "🎉 よくできました！"
          : percentage >= 60
            ? "😊 もう少し！次はきっとできる！"
            : "💪 がんばれ！次は必ず正解できます！";
  }
  if (scoreDisplay) {
    scoreDisplay.innerHTML = `
      <div class="${circleClass}">
        ${isPerfect ? '<div class="score-perfect-icon mb-1 text-[38px]">✅</div>' : ""}
        <div class="score-percentage mb-2.5 text-[50px] font-bold">${percentage}%</div>
        <div class="text-lg">${correctCount} / ${total} 正解</div>
      </div>
    `;
  }
}

/**
 * 現在のフィルター対象の問題がすべて学習済みかチェックし、達成時におめでとうメッセージを表示する。
 * 達成時は単元のステージを1段階進め、次のサイクルのために mastery をリセットする。
 */
export async function checkAllMasteredAndCongratulate(deps: {
  useCase: QuizUseCase;
  effectiveFilter: QuizFilter;
  showConfirmDialog: (message: string, alertOnly?: boolean) => Promise<boolean>;
}): Promise<void> {
  const filteredQuestions = deps.useCase.getFilteredQuestions(deps.effectiveFilter);
  if (filteredQuestions.length === 0) return;
  const masteredSet = new Set(deps.useCase.getMasteredIds());
  const allMastered = filteredQuestions.every((q) => masteredSet.has(q.id));
  if (allMastered) {
    await deps.showConfirmDialog("🎉 おめでとうございます！\nこの単元のすべての問題を学習済みにしました！", true);
    // ステージを1段階進める（学習済→復習済→修了済）
    if (deps.effectiveFilter.category !== "all") {
      deps.useCase.advanceCategoryStage(deps.effectiveFilter.subject, deps.effectiveFilter.category);
    }
  }
}

/**
 * 学習済み状態をトグルする。確認ダイアログで承諾された場合のみ更新を行う。
 */
export async function toggleLearnedStatus(deps: {
  useCase: QuizUseCase;
  effectiveFilter: QuizFilter;
  showConfirmDialog: (message: string) => Promise<boolean>;
  onAfterToggle: () => void;
}): Promise<void> {
  const isCurrentlyLearned = isCurrentCategoryLearned(deps.useCase, deps.effectiveFilter);
  const message = isCurrentlyLearned ? "この単元を未学習に戻しますか？" : "この単元を学習済みにしますか？";
  const confirmed = await deps.showConfirmDialog(message);
  if (!confirmed) return;
  if (isCurrentlyLearned) {
    deps.useCase.unmarkCategoryAsLearned(deps.effectiveFilter);
  } else {
    deps.useCase.markCategoryAsLearned(deps.effectiveFilter);
  }
  deps.onAfterToggle();
}

/**
 * 現在選択中のカテゴリが学習済み（全問題が masteredIds に含まれる）かどうかを返す。
 * 単元未選択（filter.category === "all"）の場合は false。
 */
export function isCurrentCategoryLearned(useCase: QuizUseCase, effectiveFilter: QuizFilter): boolean {
  if (effectiveFilter.category === "all") return false;
  const { mastered, total } = useCase.getMasteredCountForCategory(effectiveFilter.subject, effectiveFilter.category);
  return total > 0 && mastered === total;
}
