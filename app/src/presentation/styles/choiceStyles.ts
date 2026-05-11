/**
 * 多肢選択型問題の選択肢（choicesRenderer）CVA レシピ群。
 *
 * - `choiceLabel`: 選択肢ラベル全体のスタイル。
 *   `choice-label` クラス名は既存テスト（`querySelector(".choice-label")`）から
 *   参照されるため残置する。
 *   `:has(input:disabled)` 系の状態スタイルは Tailwind の `has-[…]` バリアントで表現し、
 *   `<input>:checked + .choice-text` の文字色変化は `peer-checked:` で表現する。
 * - `choiceInput`: 選択肢ラジオボタンのスタイル。
 * - `choiceText`: 選択肢テキストのスタイル。
 *   `choice-text` クラス名は既存テストから参照されるため残置する。
 *
 * 利用例:
 *   <label className={choiceLabel()}>
 *     <input className={choiceInput()} type="radio" />
 *     <span className={choiceText()}>選択肢テキスト</span>
 *   </label>
 */

import { cva } from "class-variance-authority";

export const choiceLabel = cva(
  "choice-label flex cursor-pointer items-center rounded-lg border-2 border-solid border-[#e0e0e0] px-5 py-[15px] transition-all duration-300" +
    " hover:border-[#0366d6] hover:bg-[#f0f7ff]" +
    " has-[input:disabled]:cursor-not-allowed has-[input:disabled]:opacity-60" +
    " has-[input:disabled]:hover:border-[#e0e0e0] has-[input:disabled]:hover:bg-transparent" +
    " has-[input:disabled:checked]:border-[#0366d6] has-[input:disabled:checked]:bg-[#f0f7ff] has-[input:disabled:checked]:opacity-100",
);

export const choiceInput = cva("peer mr-[15px] h-5 w-5 cursor-pointer disabled:cursor-not-allowed");

export const choiceText = cva("choice-text text-xl text-[#333] peer-checked:font-bold peer-checked:text-[#0366d6]");
