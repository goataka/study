/**
 * クイズ実施画面（左：問題・選択肢・ナビ、右：手書きメモ + 漢字認識キャンバス）。
 *
 * 問題テキスト・選択肢・フィードバック等は既存コントローラ
 * （`questionRenderer` / `choicesRenderer` / `answerFeedback` 等）が DOM 操作で更新する。
 * 手書きメモ用キャンバスと漢字認識キャンバスは `NotesController` /
 * `KanjiCanvasController` が初期化する。
 */

import { NotesPanel } from "./quizScreen/NotesPanel";
import { KanjiInputArea } from "./quizScreen/KanjiInputArea";

export function QuizScreen(): React.JSX.Element {
  return (
    <div id="quizScreen" className="screen hidden">
      <div className="quiz-landscape-layout">
        <div className="quiz-main-col">
          <div className="progress-bar">
            <div id="progressFill" className="progress-fill"></div>
          </div>
          <div className="question-info">
            <span id="questionNumber"></span>
            <span id="topicName" className="topic-badge"></span>
          </div>
          <div id="questionText" className="question-text"></div>
          <button
            id="speakBtn"
            className="speak-btn hidden"
            type="button"
            title="読み上げ"
            aria-label="英語を読み上げる"
          >
            🔊
          </button>
          <div id="choicesContainer" className="choices-container"></div>

          <div id="answerFeedback" className="answer-feedback hidden">
            <div className="feedback-content">
              <div id="feedbackResult" className="feedback-result"></div>
              <div id="feedbackExplanation" className="feedback-explanation"></div>
            </div>
          </div>
          <div className="navigation-buttons">
            <button id="prevBtn" className="nav-btn" disabled>
              前へ
            </button>
            <button id="nextBtn" className="nav-btn">
              次へ
            </button>
            <button id="submitBtn" className="submit-btn hidden">
              採点する
            </button>
          </div>
        </div>

        <div className="quiz-notes-col">
          <div className="notes-area">
            <div id="notesMemoContent">
              <NotesPanel />
              <KanjiInputArea />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
