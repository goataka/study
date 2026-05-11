/**
 * 漢字入力エリア（KanjiInputArea）の操作ボタン CVA レシピ。
 *
 * 旧 `.kanji-ctrl-btn` 相当のスタイルをすべて Tailwind ユーティリティで表現する。
 * `kanji-ctrl-btn` クラス自体は既存テストや CSS から直接参照されていないため
 * セマンティッククラスとして残置しない。
 *
 * 利用例:
 *   <button className={kanjiCtrlButton()}>↩</button>
 */

import { cva } from "class-variance-authority";

export const kanjiCtrlButton = cva(
  "cursor-pointer rounded border border-solid border-[#e1e4e8] bg-white px-2.5 py-1 text-base transition-colors duration-150 hover:bg-[#f3f4f6]",
);
