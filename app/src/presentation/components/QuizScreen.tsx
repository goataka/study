/**
 * クイズ実施画面（左：問題・選択肢・ナビ、右：手書きメモ + 漢字認識キャンバス）。
 *
 * 問題テキスト・選択肢・フィードバック等は既存コントローラ
 * （`questionRenderer` / `choicesRenderer` / `answerFeedback` 等）が DOM 操作で更新する。
 * 手書きメモ用キャンバスと漢字認識キャンバスは `NotesController` /
 * `KanjiCanvasController` が初期化する。
 *
 * セマンティッククラス（`progress-bar` / `progress-fill` / `topic-badge` /
 * `question-text` / `speak-btn` / `choices-container` / `answer-feedback` /
 * `feedback-content` / `feedback-result` / `feedback-explanation` /
 * `navigation-buttons` / `nav-btn` / `submit-btn`）は font-size 切替
 * （`15-font-size.css`）・レスポンシブ上書き（`10-responsive-base.css`）・
 * 単体テストのセレクタが参照するため className に残置する。
 *
 * `.answer-feedback.correct` / `.answer-feedback.incorrect` の状態色は
 * Tailwind の arbitrary variant `[&.correct]:` / `[&.incorrect]:` で
 * legacy 側の `classList.toggle("correct" / "incorrect")` と互換維持する。
 */

import { NotesPanel } from "./quizScreen/NotesPanel";
import { KanjiInputArea } from "./quizScreen/KanjiInputArea";
import { navButton } from "../styles/navButtonStyles";

export function QuizScreen(): React.JSX.Element {
  return (
    <div
      id="quizScreen"
      className="screen hidden flex flex-1 flex-col overflow-y-auto min-h-0 bg-white pt-4 px-10 pb-10 shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.2)]"
    >
      <div
        className={[
          "quiz-landscape-layout",
          // グリッドレイアウト（左：問題エリア 1fr、中：折り目 12px、右：メモエリア 2fr）
          "relative flex-1 grid min-h-0 items-stretch gap-0",
          "grid-cols-[1fr_12px_2fr]",
          // 折り目：中央の 12px カラムに影付きグラデーション縦線を before: で描画
          "before:content-[''] before:absolute before:top-0 before:bottom-0 before:w-3",
          "before:left-[calc((100%_-_12px)_/_3)]",
          "before:pointer-events-none",
          "before:bg-[linear-gradient(to_right,rgba(0,0,0,0.025)_0%,#e3e3e3_20%,#f3f3f3_50%,#e3e3e3_80%,rgba(0,0,0,0.025)_100%)]",
        ].join(" ")}
      >
        <div className="quiz-main-col col-start-1 min-w-0 overflow-y-auto min-h-0 p-3">
          <div className="progress-bar mb-5 h-2 w-full overflow-hidden rounded bg-[#e0e0e0]">
            <div id="progressFill" className="progress-fill h-full bg-[#0366d6] transition-[width] duration-300"></div>
          </div>
          <div className="question-info relative mb-5 flex items-center justify-between">
            <span id="questionNumber" className="text-lg font-bold text-[#666]"></span>
            <span
              id="topicName"
              className="topic-badge absolute left-1/2 max-w-[40%] -translate-x-1/2 overflow-hidden rounded-xl bg-[#0366d6] px-3 py-1 text-sm text-ellipsis whitespace-nowrap text-white"
            ></span>
          </div>
          <div id="questionText" className="question-text mb-3 text-[26px] leading-relaxed text-[#333]"></div>
          <button
            id="speakBtn"
            className="speak-btn mb-[18px] inline-flex cursor-pointer items-center justify-center rounded-[20px] border border-solid border-[#0366d6] bg-white px-3.5 py-1 text-lg text-[#0366d6] transition-colors duration-200 hover:bg-[#f0f7ff]"
            type="button"
            title="読み上げ"
            aria-label="英語を読み上げる"
          >
            🔊
          </button>
          {/* `.speak-btn.hidden + .choices-container` のマージン補正は legacy CSS に残置 */}
          <div id="choicesContainer" className="choices-container mb-[30px] flex flex-col gap-3"></div>

          <div
            id="answerFeedback"
            className={[
              "answer-feedback hidden",
              "my-5 rounded-lg p-5",
              // fadeIn アニメーション（@keyframes は 09-quiz-screen.css に残置）
              "[animation:fadeIn_0.3s_ease-in]",
              // .correct / .incorrect 状態に応じた背景・枠線
              "border-2 border-solid border-transparent",
              "[&.correct]:bg-[#e8f5e9] [&.correct]:border-[#4caf50]",
              "[&.incorrect]:bg-[#ffebee] [&.incorrect]:border-[#f44336]",
              // feedback-result の文字色を親クラスで制御するためのグループ化
              "group",
            ].join(" ")}
          >
            <div className="feedback-content flex flex-col gap-3">
              <div
                id="feedbackResult"
                className="feedback-result flex items-center gap-2 text-xl font-bold group-[.correct]:text-[#2e7d32] group-[.incorrect]:text-[#c62828]"
              ></div>
              <div
                id="feedbackExplanation"
                className="feedback-explanation rounded bg-white/70 p-3 text-lg leading-relaxed text-[#333]"
              ></div>
            </div>
          </div>
          <div className="navigation-buttons flex justify-between gap-[15px]">
            <button id="prevBtn" className={navButton({ variant: "nav" })} disabled>
              前へ
            </button>
            <button id="nextBtn" className={navButton({ variant: "nav" })}>
              次へ
            </button>
            <button id="submitBtn" className={navButton({ variant: "submit", hidden: true })}>
              採点する
            </button>
          </div>
        </div>

        <div className="quiz-notes-col col-start-3 flex flex-col min-h-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border-2 border-solid border-[#e1e4e8] bg-transparent">
            <div id="notesMemoContent" className="flex min-h-0 flex-1 flex-col">
              <NotesPanel />
              <KanjiInputArea />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
