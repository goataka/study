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
    <div id="quizScreen" className="screen hidden">
      <div className="quiz-landscape-layout">
        <div className="quiz-main-col">
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
          <div id="questionText" className="question-text mb-3 text-[26px] leading-relaxed font-bold text-[#333]"></div>
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

          <div id="answerFeedback" className="answer-feedback hidden">
            <div className="feedback-content flex flex-col gap-3">
              <div id="feedbackResult" className="feedback-result flex items-center gap-2 text-xl font-bold"></div>
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
            <button id="submitBtn" className={`${navButton({ variant: "submit" })} hidden`}>
              採点する
            </button>
          </div>
        </div>

        <div className="quiz-notes-col">
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
