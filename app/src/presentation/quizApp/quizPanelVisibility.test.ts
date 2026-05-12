// @vitest-environment jsdom

import { describe, expect, it, beforeEach } from "vitest";
import { updateQuizPanelVisibility } from "./quizPanelVisibility";

function createParams(subject: string) {
  return {
    subject,
    hasSelectedUnit: false,
    selectionLevel: "none" as const,
    isGradeGroupSelected: false,
    activePanelTab: "quiz" as const,
    onRenderProgressDetail: () => {},
    onShowPanelTab: () => {},
    onUpdateSelectedUnitInfo: () => {},
  };
}

describe("QuizApp — クイズパネル表示制御仕様", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="subjectContent"><div class="quiz-panel"></div><div class="notebook-spine"></div></div>
      <div class="category-panel notebook-lines bg-white shadow-[inset_-3px_0_6px_rgba(0,0,0,0.08)]"></div>
      <div class="category-status-filter"></div>
      <div id="overallDateNav"></div>
      <div id="allSubjectPanelTitle"></div>
      <div id="categoryListTitle"></div>
      <div id="quizModePanel"></div>
      <div id="guideContent"></div>
      <div id="historyContent"></div>
      <div id="questionListContent"></div>
      <div id="overallSummaryPanel"></div>
      <div id="progressDetailPanel"></div>
      <div id="selectedUnitInfo"></div>
      <div id="adminContent"></div>
    `;
  });

  it("管理タブではカテゴリパネル背景が透明になる", () => {
    updateQuizPanelVisibility(createParams("admin"));
    const categoryPanel = document.querySelector(".category-panel");
    expect(categoryPanel?.classList.contains("bg-transparent")).toBe(true);
    expect(categoryPanel?.classList.contains("notebook-lines")).toBe(false);
  });

  it("進度タブではカテゴリパネル背景が透明になる", () => {
    updateQuizPanelVisibility(createParams("progress"));
    const categoryPanel = document.querySelector(".category-panel");
    expect(categoryPanel?.classList.contains("bg-transparent")).toBe(true);
    expect(categoryPanel?.classList.contains("notebook-lines")).toBe(false);
  });

  it("通常教科タブではカテゴリパネル背景がノート背景に戻る", () => {
    const categoryPanel = document.querySelector(".category-panel");
    categoryPanel?.classList.add("bg-transparent");
    categoryPanel?.classList.remove("notebook-lines", "bg-white");

    updateQuizPanelVisibility(createParams("english"));

    expect(categoryPanel?.classList.contains("bg-transparent")).toBe(false);
    expect(categoryPanel?.classList.contains("notebook-lines")).toBe(true);
    expect(categoryPanel?.classList.contains("bg-white")).toBe(true);
  });
});
