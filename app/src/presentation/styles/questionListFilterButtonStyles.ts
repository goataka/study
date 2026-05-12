/**
 * 問題一覧フィルターボタン（すべて / 未学習 / 学習済）の CVA レシピ。
 *
 * セマンティッククラス（`question-list-filter-btn`）は
 * 既存のフォントサイズ切替・テスト互換のため残置する。
 *
 * `active` 状態は `questionListView.tsx` の `classList.toggle("active", ...)`
 * で切り替わるため、Tailwind の arbitrary variant `[&.active]:` で表現する。
 *
 * 利用例:
 *   <button className={questionListFilterButton()}>すべて</button>
 *   <button className={`${questionListFilterButton()} active`}>すべて</button>
 */

import { cva } from "class-variance-authority";

export const questionListFilterButton = cva(
  "question-list-filter-btn cursor-pointer rounded-xl border border-solid border-[#d1d5da] bg-white px-3 py-1 text-sm text-[#586069] transition-colors duration-150 hover:border-[#0366d6] hover:bg-[#e8f0fe] hover:text-[#0366d6] [&.active]:border-[#0366d6] [&.active]:bg-[#0366d6] [&.active]:text-white",
);
