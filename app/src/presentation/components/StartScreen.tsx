/**
 * スタート画面（教科選択時に表示するメイン画面）の最上位コンポーネント。
 *
 * ヘッダー / 単元一覧パネル / 右側パネル / フッター を子コンポーネントから合成する。
 * 各子要素は既存 `QuizApp` 配下のコントローラ群が `getElementById` 経由で操作する。
 */

import { StartHeader } from "./startScreen/StartHeader";
import { CategoryPanel } from "./startScreen/CategoryPanel";
import { QuizPanel } from "./startScreen/QuizPanel";
import { ProgressDetailPanel } from "./startScreen/ProgressDetailPanel";
import { OverallSummaryPanel } from "./startScreen/OverallSummaryPanel";

export function StartScreen(): React.JSX.Element {
  return (
    <div id="startScreen" className="screen">
      <StartHeader />
      <div className="start-content-layout" id="subjectContent">
        <CategoryPanel />
        <div className="notebook-spine" aria-hidden="true"></div>
        <div className="quiz-panel">
          <button id="mobileBackBtn" className="mobile-back-btn" type="button" aria-label="単元一覧に戻る">
            ← 単元一覧
          </button>
          <div id="selectedUnitInfo" className="selected-unit-info hidden"></div>
          <QuizPanel />
          <ProgressDetailPanel />
          <OverallSummaryPanel />
          <div id="adminContent" className="hidden admin-content-panel" role="region" aria-label="管理"></div>
        </div>
      </div>
      <footer className="app-footer"></footer>
    </div>
  );
}
