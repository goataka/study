/**
 * 結果画面。
 *
 * 単元名・メッセージ・スコア・詳細結果は既存コントローラ（`resultScreenView` 等）が
 * 動的に描画する。ボタン操作は QuizApp のイベントハンドラで処理される。
 */

import { button } from "../styles/buttonStyles";

export function ResultScreen(): React.JSX.Element {
  return (
    <div id="resultScreen" className="screen hidden">
      <h2>確認結果</h2>
      <div id="resultUnitName" className="result-unit-name hidden"></div>
      <div id="resultMessage" className="result-message"></div>
      <div id="scoreDisplay" className="score-display"></div>
      <div className="button-group">
        <button id="retryAllBtn" className={button({ variant: "primary" })}>
          もう一度
        </button>
        <button id="backToStartBtn" className={button({ variant: "tertiary" })}>
          スタート画面に戻る
        </button>
      </div>
      <div id="resultDetails" className="result-details"></div>
    </div>
  );
}
