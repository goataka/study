/**
 * `notesButton` / `penSelect` / `cancelQuizButton` CVA レシピの仕様テスト。
 */

import { describe, expect, it } from "vitest";
import { notesButton, penSelect, cancelQuizButton } from "./notesPanelStyles";

describe("notesButton スタイル（CVA）", () => {
  it("notes-btn クラスを含む", () => {
    const cls = notesButton();
    expect(cls).toContain("notes-btn");
  });

  it("eraser-active 状態のスタイルを含む", () => {
    const cls = notesButton();
    expect(cls).toContain("[&.eraser-active]");
  });
});

describe("penSelect スタイル（CVA）", () => {
  it("スタイルクラスを出力する", () => {
    const cls = penSelect();
    expect(cls).toContain("cursor-pointer");
    expect(cls).toContain("rounded");
    expect(cls).toContain("border");
  });
});

describe("cancelQuizButton スタイル（CVA）", () => {
  it("cancel-quiz-btn クラスを含む", () => {
    const cls = cancelQuizButton();
    expect(cls).toContain("cancel-quiz-btn");
  });

  it("円形ボタンのスタイルを含む", () => {
    const cls = cancelQuizButton();
    expect(cls).toContain("rounded-full");
  });
});
