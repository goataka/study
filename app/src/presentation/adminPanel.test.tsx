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
    listUsers: vi.fn(() => [
      { id: "guest", name: "ゲスト" },
      { id: "user-1", name: "太郎" },
    ]),
    getActiveUserId: vi.fn(() => "guest"),
    addUser: vi.fn((name: string) => ({ id: "user-2", name })),
    switchUser: vi.fn(() => new Promise<void>(() => {})),
    deleteUser: vi.fn(() => new Promise<void>(() => {})),
    clearActiveUserData: vi.fn(() => new Promise<void>(() => {})),
    exportAllUsersData: vi.fn(() =>
      Promise.resolve({ exportedAt: new Date().toISOString(), activeUserId: "guest", users: [] }),
    ),
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

    const manageBtn = Array.from(categoryList.querySelectorAll<HTMLButtonElement>(".panel-menu-btn")).find((btn) =>
      btn.textContent?.includes("更改"),
    ) as HTMLButtonElement;
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

  it("サンプルデータで初期化ボタンを押すとサンプル保存処理が実行される", async () => {
    const categoryList = document.getElementById("categoryList") as HTMLElement;
    const adminContent = document.getElementById("adminContent") as HTMLElement;
    const deps = createDeps();
    deps.useCase.initialize = vi.fn(() => new Promise(() => {})) as typeof deps.useCase.initialize;

    renderAdminContent(categoryList, deps);

    const resetTab = adminContent.querySelector(".admin-manage-tab[data-tab='reset']") as HTMLButtonElement;
    resetTab.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const sampleResetBtn = adminContent.querySelector(".admin-reset-sample-btn") as HTMLButtonElement;
    expect(sampleResetBtn).toBeTruthy();
    sampleResetBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(deps.showConfirmDialog).toHaveBeenCalledWith("学習データをサンプルデータで初期化します。続けますか？");
    expect(deps.useCase.clearAllData).toHaveBeenCalledTimes(1);
    expect(deps.progressRepo.saveHistory).toHaveBeenCalledTimes(1);
    expect(deps.progressRepo.saveMasteredIds).toHaveBeenCalledTimes(1);
    expect(deps.progressRepo.saveCorrectStreaks).toHaveBeenCalledTimes(1);
  });

  it("管理ボタンを再クリックしてもコンテンツは閉じない", async () => {
    const categoryList = document.getElementById("categoryList") as HTMLElement;
    const adminContent = document.getElementById("adminContent") as HTMLElement;
    const deps = createDeps();

    renderAdminContent(categoryList, deps);

    // 初期状態でも manage タブが表示されていることを確認
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(adminContent.querySelector(".admin-manage-tabs")).toBeTruthy();

    const manageBtn = Array.from(categoryList.querySelectorAll<HTMLButtonElement>(".panel-menu-btn")).find((btn) =>
      btn.textContent?.includes("更改"),
    ) as HTMLButtonElement;
    manageBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    // 再クリックしてもコンテンツは閉じない
    expect(adminContent.querySelector(".admin-manage-tabs")).toBeTruthy();
  });

  it("左メニューに「仕様」ボタンが表示される", async () => {
    const categoryList = document.getElementById("categoryList") as HTMLElement;
    const deps = createDeps();

    renderAdminContent(categoryList, deps);

    const specBtn = Array.from(categoryList.querySelectorAll<HTMLButtonElement>(".panel-menu-btn")).find((btn) =>
      btn.textContent?.includes("仕様"),
    );
    expect(specBtn).toBeTruthy();
  });

  it("ユーザーメニューでユーザー一覧を表示し、追加できる", async () => {
    const categoryList = document.getElementById("categoryList") as HTMLElement;
    const adminContent = document.getElementById("adminContent") as HTMLElement;
    const deps = createDeps();

    renderAdminContent(categoryList, deps);

    const usersBtn = Array.from(categoryList.querySelectorAll<HTMLButtonElement>(".panel-menu-btn")).find((btn) =>
      btn.textContent?.includes("ユーザー"),
    ) as HTMLButtonElement;
    expect(usersBtn).toBeTruthy();
    usersBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const items = adminContent.querySelectorAll(".admin-user-item");
    expect(items).toHaveLength(2);
    expect(adminContent.textContent).toContain("ゲスト（使用中）");

    const input = adminContent.querySelector(".admin-user-add-input") as HTMLInputElement;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    nativeSetter?.call(input, "次郎");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const addBtn = adminContent.querySelector(".admin-user-add-btn") as HTMLButtonElement;
    addBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(deps.progressRepo.addUser).toHaveBeenCalledWith("次郎");
    expect(deps.progressRepo.switchUser).toHaveBeenCalledWith("user-2");
  });

  it("ユーザーメニューで全ユーザー一括エクスポートを実行できる", async () => {
    const categoryList = document.getElementById("categoryList") as HTMLElement;
    const adminContent = document.getElementById("adminContent") as HTMLElement;
    const deps = createDeps();

    renderAdminContent(categoryList, deps);

    const usersBtn = Array.from(categoryList.querySelectorAll<HTMLButtonElement>(".panel-menu-btn")).find((btn) =>
      btn.textContent?.includes("ユーザー"),
    ) as HTMLButtonElement;
    usersBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const exportBtn = adminContent.querySelector(".admin-export-all-users-btn") as HTMLButtonElement;
    expect(exportBtn).toBeTruthy();
    exportBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(deps.progressRepo.exportAllUsersData).toHaveBeenCalledTimes(1);
  });
});
