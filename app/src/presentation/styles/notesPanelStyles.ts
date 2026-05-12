/**
 * 手書きメモパネル（NotesPanel）のボタン・セレクト CVA レシピ群。
 *
 * - `notesButton`: クリア・消しゴムボタン共通スタイル。
 *   `eraser-active` 状態は legacy 側の `classList.toggle("eraser-active", isEraser)` と
 *   互換にするため、Tailwind の arbitrary variant `[&.eraser-active]:` を採用する。
 * - `penSelect`: 線の太さ・色セレクトボックス共通スタイル。
 * - `cancelQuizButton`: 中止ボタン（円形 ✕）スタイル。
 *   セマンティッククラス（`cancel-quiz-btn`）は既存テスト互換のため残置。
 *
 * 利用例:
 *   <button className={notesButton()}>🗑️</button>
 *   <select className={penSelect()}>...</select>
 *   <button className={cancelQuizButton()}>✕</button>
 */

import { cva } from "class-variance-authority";

export const notesButton = cva(
  "notes-btn cursor-pointer rounded border border-solid border-[#d1d5da] bg-white px-2 py-1 text-lg transition-all duration-200 hover:border-[#b0b0b0] hover:bg-[#f0f0f0] [&.eraser-active]:border-[#f0a800] [&.eraser-active]:bg-[#ffe8b3]",
);

export const penSelect = cva("cursor-pointer rounded border border-solid border-[#d1d5da] bg-white px-2 py-1 text-sm");

export const cancelQuizButton = cva(
  "cancel-quiz-btn inline-flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-[#999] bg-white p-0 text-base leading-none text-[#999] transition-colors duration-200 hover:bg-[#666] hover:text-white",
);
