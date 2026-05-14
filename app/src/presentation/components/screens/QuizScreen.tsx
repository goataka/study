/**
 * クイズ実施画面（左：問題・選択肢・ナビ、右：手書きメモ + 漢字認識キャンバス）。
 *
 * 問題テキスト・フィードバック・ナビゲーション状態は `quizSessionStore` を購読して描画する。
 * 選択肢入力 UI 自体は `choicesRenderer` が描画する。
 * 手書きメモ用キャンバスと漢字認識キャンバスは `NotesController` /
 * `KanjiCanvasController` が初期化する。
 *
 * セマンティッククラス（`progress-bar` / `progress-fill` / `topic-badge` /
 * `question-text` / `choices-container` / `answer-feedback` /
 * `feedback-content` / `feedback-result` / `feedback-explanation` /
 * `navigation-buttons` / `nav-btn` / `submit-btn`）は font-size 切替
 * （`15-font-size.css`）・レスポンシブ上書き（`10-responsive-base.css`）・
 * 単体テストのセレクタが参照するため className に残置する。
 *
 * `.answer-feedback.correct` / `.answer-feedback.incorrect` の状態色は
 * Tailwind の arbitrary variant `[&.correct]:` / `[&.incorrect]:` で
 * legacy 側の `classList.toggle("correct" / "incorrect")` と互換維持する。
 */

import { useSyncExternalStore } from "react";
import { NotesPanel } from "../quizScreen/NotesPanel";
import { KanjiInputArea } from "../quizScreen/KanjiInputArea";
import { navButton } from "../../styles/navButtonStyles";
import { getQuizSessionSnapshot, subscribeQuizSessionStore } from "../quizSessionStore";
import { choicesContentStore } from "../choicesContentStore";
import { StartHeader } from "../startScreen/StartHeader";
import type { ScreenName } from "../screenStore";

interface QuizScreenProps {
  currentScreen: ScreenName;
}

export function QuizScreen({ currentScreen }: QuizScreenProps): React.JSX.Element {
  const quizSession = useSyncExternalStore(subscribeQuizSessionStore, getQuizSessionSnapshot, getQuizSessionSnapshot);
  const question = quizSession.question;

  const nextButtonClass = [navButton({ variant: "nav" }), quizSession.nextHidden ? "hidden" : ""].join(" ");

  return (
    <div
      id="quizScreen"
      className={[
        "screen",
        currentScreen !== "quiz" ? "hidden" : "",
        // 折り目をヘッダー上端まで延ばすために relative を追加。
        // before: 疑似要素で全高にわたる縦線を描画する（header 含む）。
        // 0.4 は左カラム比率 1.2 / (1.2 + 1.8) に対応。px-10（40px）分のオフセットを加算する。
        "relative flex flex-1 flex-col overflow-y-auto min-h-0 bg-white px-10 pb-10 shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.2)]",
        "before:content-[''] before:absolute before:top-0 before:bottom-0 before:w-3",
        "before:left-[calc(40px_+_(100%_-_92px)_*_0.4)]",
        "before:pointer-events-none before:z-0",
        "before:bg-[linear-gradient(to_right,rgba(0,0,0,0.025)_0%,#e3e3e3_20%,#f3f3f3_50%,#e3e3e3_80%,rgba(0,0,0,0.025)_100%)]",
        "max-[900px]:before:hidden",
      ].join(" ")}
    >
      <StartHeader />
      <div
        id="quizLayout"
        className={[
          "quiz-landscape-layout",
          // グリッドレイアウト（左：問題エリア 1.2fr、中：折り目 12px、右：メモエリア 1.8fr）
          "relative flex-1 grid items-stretch gap-0",
          "grid-cols-[1.2fr_12px_1.8fr] max-[900px]:grid-cols-1",
        ].join(" ")}
      >
        <div className="quiz-main-col notebook-lines bg-white col-start-1 min-w-0 p-3 max-[900px]:col-start-1">
          <div className="progress-bar mb-5 h-2 w-full overflow-hidden rounded bg-[#e0e0e0]">
            <div
              id="progressFill"
              className="progress-fill h-full bg-[#0366d6] transition-[width] duration-300"
              style={{ width: `${quizSession.progressPercent}%` }}
            ></div>
          </div>
          <div className="question-info relative mb-5 flex items-center justify-between">
            <span id="questionNumber" className="text-lg font-bold text-[#666]">
              {quizSession.questionNumberText}
            </span>
            <span
              id="topicName"
              className="topic-badge absolute left-1/2 max-w-[40%] -translate-x-1/2 overflow-hidden rounded-xl bg-[#0366d6] px-3 py-1 text-sm text-ellipsis whitespace-nowrap text-white after:content-[''] after:absolute after:left-1/2 after:top-full after:mt-1 after:h-2 after:w-2 after:-translate-x-1/2 after:rounded-[2px] after:bg-[#0366d6]"
            >
              {quizSession.topicName}
            </span>
          </div>
          <div id="questionText" className="question-text mb-3 text-[26px] leading-relaxed text-[#333]">
            {question?.question ?? ""}
          </div>
          <div id="choicesContainer" className="choices-container mb-[30px] flex flex-col gap-3">
            <ChoicesSection />
          </div>

          <div
            id="answerFeedback"
            className={[
              "answer-feedback",
              quizSession.answerFeedback.visible ? "" : "hidden",
              "my-5 rounded-lg p-5",
              "animate-feedback-in",
              // .correct / .incorrect 状態に応じた背景・枠線
              "border-2 border-solid border-transparent",
              quizSession.answerFeedback.isCorrect
                ? "correct [&.correct]:bg-[#e8f5e9] [&.correct]:border-[#4caf50]"
                : "incorrect [&.incorrect]:bg-[#ffebee] [&.incorrect]:border-[#f44336]",
              // feedback-result の文字色を親クラスで制御するためのグループ化
              "group",
            ].join(" ")}
          >
            <div className="feedback-content flex flex-col gap-3">
              <div
                id="feedbackResult"
                className="feedback-result flex items-center gap-2 text-xl font-bold group-[.correct]:text-[#2e7d32] group-[.incorrect]:text-[#c62828]"
              >
                {quizSession.answerFeedback.resultText}
              </div>
              <div
                id="feedbackExplanation"
                className="feedback-explanation rounded bg-white/70 p-3 text-lg leading-relaxed text-[#333]"
              >
                {quizSession.answerFeedback.explanation}
              </div>
            </div>
          </div>
          <div className="navigation-buttons flex justify-between gap-[15px]">
            <button id="prevBtn" className={navButton({ variant: "nav" })} disabled={quizSession.prevDisabled}>
              前へ
            </button>
            <button id="nextBtn" className={nextButtonClass} disabled={quizSession.nextDisabled}>
              次へ
            </button>
            <button
              id="submitBtn"
              className={navButton({ variant: "submit", hidden: quizSession.submitHidden })}
              disabled={quizSession.submitDisabled}
            >
              採点する
            </button>
          </div>
        </div>

        <div
          id="quizNotesColumn"
          className="quiz-notes-col col-start-3 flex flex-col min-h-0 max-[900px]:col-start-1 max-[900px]:min-h-[260px]"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-2 border-solid border-[#e1e4e8] bg-transparent">
            <div id="notesMemoContent" className="flex min-h-0 flex-1 flex-col">
              <NotesPanel showKanjiInput={quizSession.showKanjiInput} />
              <KanjiInputArea showKanjiInput={quizSession.showKanjiInput} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const QUOTED_SPEECH_PATTERNS = [/「([^」]+)」/, /`([^`]+)`/] as const;
const TRAILING_HINT_PATTERN = /\s*\([^)]*\)\s*$/;

export function extractSpeechText(questionText: string): string {
  const trimmed = questionText.trim();
  for (const pattern of QUOTED_SPEECH_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return trimmed.replace(TRAILING_HINT_PATTERN, "").trim();
}

/** クイズ選択肢エリア — choicesContentStore から描画。 */
function ChoicesSection(): React.JSX.Element {
  const node = useSyncExternalStore(choicesContentStore.subscribe, choicesContentStore.get, choicesContentStore.get);
  return <>{node}</>;
}
