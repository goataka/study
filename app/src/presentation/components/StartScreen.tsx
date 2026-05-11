/**
 * スタート画面（教科選択時に表示するメイン画面）の最上位コンポーネント。
 *
 * ヘッダー / 単元一覧パネル / 右側パネル / フッター を子コンポーネントから合成する。
 * 各子要素は既存 `QuizApp` 配下のコントローラ群が `getElementById` 経由で操作する。
 */

import { useSyncExternalStore } from "react";
import { StartHeader } from "./startScreen/StartHeader";
import { CategoryPanel } from "./startScreen/CategoryPanel";
import { QuizPanel } from "./startScreen/QuizPanel";
import { ProgressDetailPanel } from "./startScreen/ProgressDetailPanel";
import { OverallSummaryPanel } from "./startScreen/OverallSummaryPanel";
import type { ScreenName } from "./screenStore";
import { selectedUnitInfoContentStore } from "./selectedUnitInfoContentStore";

interface StartScreenProps {
  currentScreen: ScreenName;
}

export function StartScreen({ currentScreen }: StartScreenProps): React.JSX.Element {
  return (
    <div
      id="startScreen"
      className={[
        "screen",
        currentScreen !== "start" ? "hidden" : "",
        // レイアウト（.screen から移行）
        "flex flex-1 flex-col min-h-0",
        // #startScreen 固有: ヘッダー/コンテンツ/フッターを1つのノートとして見せるため白背景 + 余白
        "bg-white p-4 overflow-hidden relative",
        // ノート全体の影
        "shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.2)]",
      ].join(" ")}
    >
      <StartHeader />
      <div
        className="start-content-layout grid grid-cols-[1fr_12px_2fr] gap-0 items-stretch flex-1 min-h-0 bg-white overflow-hidden"
        id="subjectContent"
      >
        <CategoryPanel />
        <div
          className="notebook-spine shrink-0 w-3 bg-[linear-gradient(to_right,rgba(0,0,0,0.025)_0%,#e3e3e3_20%,#f3f3f3_50%,#e3e3e3_80%,rgba(0,0,0,0.025)_100%)]"
          aria-hidden="true"
        ></div>
        <div
          className={[
            "quiz-panel",
            "bg-white",
            "[background-image:repeating-linear-gradient(transparent,transparent_31px,#d8e8f8_31px,#d8e8f8_32px)]",
            "[background-size:100%_32px] [background-position:0_12px]",
            "border-none overflow-hidden flex flex-col",
            "shadow-[inset_3px_0_6px_rgba(0,0,0,0.08)]",
          ].join(" ")}
        >
          <button
            id="mobileBackBtn"
            className="mobile-back-btn px-3 py-2 text-sm font-semibold text-[#0366d6] border-none bg-transparent cursor-pointer hover:underline"
            type="button"
            aria-label="単元一覧に戻る"
          >
            ← 単元一覧
          </button>
          <div id="selectedUnitInfo" className="selected-unit-info hidden">
            <SelectedUnitInfoSection />
          </div>
          <QuizPanel />
          <ProgressDetailPanel />
          <OverallSummaryPanel />
          <div id="adminContent" className="hidden admin-content-panel" role="region" aria-label="管理"></div>
        </div>
      </div>
      <footer className="flex min-h-[8px] shrink-0 items-center justify-center gap-3 border-t-2 border-[#c8d8e8] bg-white px-3 py-1 mt-2 text-[#586069] shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.2)] app-footer"></footer>
    </div>
  );
}

/** 選択中の単元情報パネル — selectedUnitInfoContentStore から描画。 */
function SelectedUnitInfoSection(): React.JSX.Element {
  const node = useSyncExternalStore(selectedUnitInfoContentStore.subscribe, selectedUnitInfoContentStore.get, selectedUnitInfoContentStore.get);
  return <>{node}</>;
}
