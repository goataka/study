/**
 * `.panel-tab` 共通スタイル（インナータブ）。
 *
 * 旧 `.panel-tab` / `.panel-tab:hover` / `.panel-tab.active` 相当の見た目を
 * Tailwind ユーティリティで表現する。
 *
 * 設計のポイント:
 * - `active` 状態は legacy 側の `overallSummaryPanel.tsx` が
 *   `classList.toggle("active", ...)` で制御するケースもあるため、
 *   CVA の variant prop ではなく Tailwind の arbitrary variant
 *   `[&.active]:...` を使ってクラスの有無で見た目を切り替える。
 * - これにより React props 経由で `active` を渡すコンポーネント
 *   （OverallSummaryPanel / ProgressDetailPanel / QuizPanel）と、
 *   imperatively に classList を操作する legacy 関数の両方で
 *   同じ見た目が得られる。
 *
 * セマンティッククラス（`panel-tab`、`active`）は以下から参照されるため**残置**:
 * - `15-font-size.css` の `body.font-size-medium .panel-tab { font-size: ... }` 等
 * - 単体テスト（`categoryListActive.test.ts`）の `.panel-tab[data-panel]` セレクタ
 *
 * 利用例:
 *   <button className={panelTab()}>Tab1</button>
 *   <button className={`${panelTab()} active`}>Active Tab</button>
 *   <button className={isActive ? `${panelTab()} active` : panelTab()}>...</button>
 */

export const panelTab = cva(
  [
    // 識別子・font-size 切替用に残置
    "panel-tab",
    // base
    "flex-1 cursor-pointer border-none border-b-2 border-solid border-b-transparent",
    "bg-transparent px-4 py-2.5 text-base font-semibold whitespace-nowrap text-[#586069]",
    "transition-[color,border-color] duration-150",
    // hover
    "hover:bg-[#e8f0fe] hover:text-[#0366d6]",
    // active（classList で `.active` が付与されたとき適用）
    "[&.active]:border-b-[#0366d6]",
    "[&.active]:bg-white",
    "[&.active]:text-[#0366d6]",
  ].join(" "),
);

/** `.panel-tabs` コンテナの共通スタイル（インナータブのバー）。 */
export const panelTabs = cva("panel-tabs flex border-b border-solid border-[#e1e4e8] bg-[#f6f8fa]");
import { cva } from "class-variance-authority";
