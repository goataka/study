// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuizUseCase } from "../application/quizUseCase";
import type { IProgressRepository } from "../application/ports";
import { renderAdminContent } from "./adminPanel";

function createDeps() {
  const useCase = {
    exportAllData: vi.fn(() => ({
      exportedAt: new Date().toISOString(),
      userName: "テスト",
      wrongIds: [],
      correctStreaks: { q1: 2 },
      masteredIds: ["q1"],
      history: [],
      categoryViewMode: "category",
      fontSizeLevel: "small",
      recommendedCounts: {},
    })),
    initialize: vi.fn(() => Promise.resolve()),
    clearAllData: vi.fn(() => Promise.resolve()),
  } as unknown as QuizUseCase;

  const progressRepo = {
    loadQuizSettings: vi.fn(() => ({
      questionCount: 10,
      quizOrder: "random",
      includeMastered: true,
    })),
    saveHistory: vi.fn(),
    saveMasteredIds: vi.fn(),
    saveCorrectStreaks: vi.fn(),
    loadHistory: vi.fn(() => []),
  } as unknown as IProgressRepository;

  return {
    useCase,
    progressRepo,
    shareUrl: "https://example.com",
    showConfirmDialog: vi.fn(() => Promise.resolve(true)),
  };
}

describe("renderAdminContent", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="categoryList"></div>
      <div id="adminContent"></div>
    `;
  });

  it("管理メニューを表示し、管理ボタンで管理タブを開ける", async () => {
    const categoryList = document.getElementById("categoryList") as HTMLElement;
    const adminContent = document.getElementById("adminContent") as HTMLElement;
    const deps = createDeps();

    renderAdminContent(categoryList, deps);

    const manageBtn = Array.from(categoryList.querySelectorAll<HTMLButtonElement>(".admin-menu-btn.admin-menu-child")).find((btn) =>
      btn.textContent?.includes("管理"),
    ) as HTMLButtonElement;
    expect(manageBtn).toBeTruthy();
    expect(manageBtn.textContent).toContain("管理");

    manageBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const resetTab = adminContent.querySelector(".admin-manage-tab[data-tab='reset']") as HTMLButtonElement;
    expect(resetTab).toBeTruthy();
    resetTab.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(adminContent.querySelector(".admin-reset-btn")).toBeTruthy();
  });

  it("管理ボタンを再クリックするとコンテンツが閉じる", async () => {
    const categoryList = document.getElementById("categoryList") as HTMLElement;
    const adminContent = document.getElementById("adminContent") as HTMLElement;
    const deps = createDeps();

    renderAdminContent(categoryList, deps);

    const manageBtn = Array.from(categoryList.querySelectorAll<HTMLButtonElement>(".admin-menu-btn.admin-menu-child")).find((btn) =>
      btn.textContent?.includes("管理"),
    ) as HTMLButtonElement;
    manageBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(adminContent.querySelector(".admin-manage-tabs")).toBeTruthy();

    manageBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(adminContent.querySelector(".admin-manage-tabs")).toBeNull();
  });
});
