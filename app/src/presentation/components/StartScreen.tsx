/**
 * スタート画面（教科選択時に表示するメイン画面）の最上位コンポーネント。
 *
 * ヘッダー / 単元一覧パネル / 右側パネル を子コンポーネントから合成する。
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
import { supportContentStore } from "./supportContentStore";

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
        // #startScreen 固有: ヘッダー/コンテンツを1つのノートとして見せるため白背景 + 余白
        "bg-white px-2 pb-0 pt-0 overflow-hidden relative",
        // ノート全体の影
        "shadow-[0_8px_24px_rgba(0,0,0,0.4),0_2px_6px_rgba(0,0,0,0.2)]",
      ].join(" ")}
    >
      {/* ノートの折り目（スタート画面全体にまたがる絶対配置・ヘッダー領域含む） */}
      <div
        className="notebook-spine hidden md:block absolute top-0 bottom-0 w-3 z-0 pointer-events-none bg-[linear-gradient(to_right,rgba(0,0,0,0.025)_0%,#e3e3e3_20%,#f3f3f3_50%,#e3e3e3_80%,rgba(0,0,0,0.025)_100%)]"
        style={{ left: "calc((100% - 28px) / 3 + 8px)" }}
        aria-hidden="true"
      />
      <StartHeader />
      <div
        className="start-content-layout grid grid-cols-1 md:grid-cols-[1fr_12px_2fr] md:[&.category-only]:grid-cols-1 md:[&.category-only_.quiz-panel]:hidden gap-0 items-stretch flex-1 min-h-0 bg-white overflow-hidden"
        id="subjectContent"
      >
        <CategoryPanel />
        {/* グリッド列2のスペーサー（折り目の位置を保持するためのダミー要素） */}
        <div className="notebook-spine hidden md:block w-3 shrink-0" aria-hidden="true" />
        <div
          id="startQuizPanel"
          className={[
            "quiz-panel",
            "notebook-lines bg-white",
            "border-none overflow-hidden flex flex-col",
            "shadow-none md:shadow-[inset_3px_0_6px_rgba(0,0,0,0.08)]",
          ].join(" ")}
        >
          <div id="selectedUnitInfo" className="selected-unit-info hidden">
            <SelectedUnitInfoSection />
          </div>
          <QuizPanel />
          <ProgressDetailPanel />
          <OverallSummaryPanel />
          <div id="adminContent" className="hidden admin-content-panel" role="region" aria-label="管理"></div>
          <div
            id="supportContent"
            className="hidden support-content-panel flex flex-col flex-1 overflow-hidden"
            role="region"
            aria-label="サポート"
          >
            <SupportContentSection />
          </div>
        </div>
      </div>
    </div>
  );
}

/** 選択中の単元情報パネル — selectedUnitInfoContentStore から描画。 */
function SelectedUnitInfoSection(): React.JSX.Element {
  const node = useSyncExternalStore(
    selectedUnitInfoContentStore.subscribe,
    selectedUnitInfoContentStore.get,
    selectedUnitInfoContentStore.get,
  );
  return <>{node}</>;
}

/** サポートコンテンツ右列 — supportContentStore から描画。 */
function SupportContentSection(): React.JSX.Element {
  const node = useSyncExternalStore(supportContentStore.subscribe, supportContentStore.get, supportContentStore.get);
  return <>{node}</>;
}
