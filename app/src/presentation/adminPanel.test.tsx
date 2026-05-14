// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QuizUseCase } from "../application/quizUseCase";
import type { IProgressRepository } from "../application/ports";
import { renderAdminContent } from "./adminPanel";
import { mountTestContentBridge, unmountAllTrackedRoots } from "./quizApp/testHelpers";

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

describe("管理パネル描画", () => {
  beforeEach(() => {
    unmountAllTrackedRoots();
    document.body.innerHTML = `
      <div id="categoryList"></div>
      <div id="adminContent"></div>
    `;
    mountTestContentBridge();
  });

  it("管理メニューを表示し、更改ボタンで管理タブを開ける", async () => {
    const categoryList = document.getElementById("categoryList") as HTMLElement;
    const adminContent = document.getElementById("adminContent") as HTMLElement;
    const deps = createDeps();

    renderAdminContent(categoryList, deps);

    const manageBtn = Array.from(
      categoryList.querySelectorAll<HTMLButtonElement>(".admin-menu-btn.admin-menu-child"),
    ).find((btn) => btn.textContent?.includes("更改")) as HTMLButtonElement;
    expect(manageBtn).toBeTruthy();
    expect(manageBtn.textContent).toContain("更改");

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

    const manageBtn = Array.from(
      categoryList.querySelectorAll<HTMLButtonElement>(".admin-menu-btn.admin-menu-child"),
    ).find((btn) => btn.textContent?.includes("更改")) as HTMLButtonElement;
    manageBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(adminContent.querySelector(".admin-manage-tabs")).toBeTruthy();

    manageBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(adminContent.querySelector(".admin-manage-tabs")).toBeNull();
  });

  it("左メニューに「仕様」ボタンが表示される", async () => {
    const categoryList = document.getElementById("categoryList") as HTMLElement;
    const deps = createDeps();

    renderAdminContent(categoryList, deps);

    const specBtn = Array.from(
      categoryList.querySelectorAll<HTMLButtonElement>(".admin-menu-btn.admin-menu-child"),
    ).find((btn) => btn.textContent?.includes("仕様"));
    expect(specBtn).toBeTruthy();
  });
});
