/**
 * 結果画面。
 *
 * 単元名・メッセージ・スコア・詳細結果は既存コントローラ（`resultScreenView` 等）が
 * 動的に描画する。ボタン操作は QuizApp のイベントハンドラで処理される。
 */

import { button } from "../styles/buttonStyles";

export function ResultScreen(): React.JSX.Element {
  return (
    <div
      id="resultScreen"
      className="screen hidden flex flex-1 flex-col overflow-y-auto min-h-0 bg-white pt-4 px-10 pb-10 shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.2)]"
    >
      <h2 className="mb-1 text-center text-[26px] text-[#333]">確認結果</h2>
      {/* `result-unit-name` クラス名は font-size 切替の参照キーとして残置 */}
      <div id="resultUnitName" className="result-unit-name mb-5 hidden text-center text-base text-[#586069]"></div>
      {/* `result-message` クラス名は font-size 切替の参照キーとして残置 */}
      <div id="resultMessage" className="result-message mb-4 text-center text-[22px] font-bold text-[#0366d6]"></div>
      <div id="scoreDisplay" className="mb-10 flex justify-center"></div>
      <div className="button-group mb-5 flex flex-col gap-[15px]">
        <button id="retryAllBtn" className={button({ variant: "primary" })}>
          もう一度
        </button>
        <button id="backToStartBtn" className={button({ variant: "tertiary" })}>
          スタート画面に戻る
        </button>
      </div>
      {/* `result-details` クラス名は font-size 切替（`.result-details h3`）の参照キーとして残置 */}
      <div id="resultDetails" className="result-details"></div>
    </div>
  );
}
