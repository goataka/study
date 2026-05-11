/**
 * 結果画面。
 *
 * 単元名・メッセージ・スコア・詳細結果は resultStore を購読して React 描画する。
 * ボタン操作は QuizApp のイベントハンドラで処理される。
 */

import { useMemo, useSyncExternalStore } from "react";
import type { AnswerResult } from "../../application/quizUseCase";
import { buildUnitName } from "../uiHelpers";
import { ResultDetailsList } from "../quizApp/ResultDetailsList";
import { button } from "../styles/buttonStyles";
import { scoreCircle } from "../styles/scoreCircleStyles";
import { getResultSnapshot, subscribeResultStore } from "./resultStore";
import type { ScreenName } from "./screenStore";

interface ResultScreenProps {
  currentScreen: ScreenName;
}

export function ResultScreen({ currentScreen }: ResultScreenProps): React.JSX.Element {
  const results = useSyncExternalStore(subscribeResultStore, getResultSnapshot, getResultSnapshot);
  const vm = useMemo(() => buildResultViewModel(results), [results]);

  return (
    <div
      id="resultScreen"
      data-react-managed="true"
      className={[
        "screen",
        currentScreen !== "result" ? "hidden" : "",
        "flex flex-1 flex-col overflow-y-auto min-h-0 bg-white pt-4 px-10 pb-10 shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.2)] relative",
      ].join(" ")}
    >
      <button
        type="button"
        className="result-close-x-btn absolute top-4 right-4 inline-flex items-center justify-center w-8 h-8 rounded-full border border-[#d1d5da] bg-white text-[#586069] cursor-pointer text-base font-semibold hover:bg-[#f0f7ff] hover:text-[#0366d6] hover:border-[#0366d6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0366d6] focus-visible:ring-offset-2 transition-[background,color,border-color] duration-150"
        aria-label="閉じる"
        title="閉じる"
        onClick={() => {
          document.getElementById("backToStartBtn")?.click();
        }}
      >
        ✕
      </button>
      <h2 className="mb-1 text-center text-[26px] text-[#333]">確認結果</h2>
      {/* `result-unit-name` クラス名は font-size 切替の参照キーとして残置 */}
      <div
        id="resultUnitName"
        className={`result-unit-name mb-5 text-center text-base text-[#586069]${vm.unitName ? "" : " hidden"}`}
      >
        {vm.unitName}
      </div>
      {/* `result-message` クラス名は font-size 切替の参照キーとして残置 */}
      <div id="resultMessage" className="result-message mb-4 text-center text-[22px] font-bold text-[#0366d6]">
        {vm.message}
      </div>
      <div id="scoreDisplay" className="mb-10 flex justify-center">
        {vm.total > 0 ? (
          <div className={`${scoreCircle({ result: vm.scoreClass })} relative overflow-visible`}>
            {vm.isPerfect ? (
              <>
                <span className="absolute -left-6 top-3 text-2xl animate-score-celebration" aria-hidden="true">
                  🎉
                </span>
                <span
                  className="absolute -right-6 top-8 text-2xl animate-score-celebration [animation-delay:0.15s]"
                  aria-hidden="true"
                >
                  🎊
                </span>
              </>
            ) : null}
            {vm.isPerfect ? <div className="score-perfect-icon mb-1 text-[38px]">✅</div> : null}
            <div className="score-percentage mb-2.5 text-[50px] font-bold">{vm.percentage}%</div>
            <div className="text-lg">
              {vm.correctCount} / {vm.total} 正解
            </div>
          </div>
        ) : null}
      </div>
      <div className="button-group mb-5 flex flex-col gap-[15px]">
        <button id="retryAllBtn" className={button({ variant: "primary" })}>
          もう一度
        </button>
        <button id="backToStartBtn" className={button({ variant: "tertiary" })}>
          スタート画面に戻る
        </button>
      </div>
      {/* `result-details` クラス名は font-size 切替（`.result-details h3`）の参照キーとして残置 */}
      <div id="resultDetails" className="result-details">
        {results && results.length > 0 ? <ResultDetailsList results={results} /> : null}
      </div>
    </div>
  );
}

function buildResultViewModel(results: AnswerResult[] | null): {
  unitName: string;
  message: string;
  correctCount: number;
  total: number;
  percentage: number;
  isPerfect: boolean;
  scoreClass: "perfect" | "pass" | "fail";
} {
  const correctCount = results?.filter((r) => r.isCorrect).length ?? 0;
  const total = results?.length ?? 0;
  const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const unitName = buildUnitName(results?.[0]?.question);
  const message =
    percentage === 100
      ? "🌟 満点！すごい！"
      : percentage >= 80
        ? "🎉 よくできました！"
        : percentage >= 60
          ? "😊 もう少し！次はきっとできる！"
          : "💪 がんばれ！次は必ず正解できます！";
  const isPerfect = total > 0 && correctCount === total;
  const scoreClass: "perfect" | "pass" | "fail" = isPerfect ? "perfect" : percentage >= 70 ? "pass" : "fail";

  return { unitName, message, correctCount, total, percentage, isPerfect, scoreClass };
}
