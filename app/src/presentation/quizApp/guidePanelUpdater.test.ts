// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import React from "react";
import { loadGuideContent } from "./guideLoader";
import { updateGuidePanelContentByIds } from "./guidePanelUpdater";
import { QuizPanel } from "../components/startScreen/QuizPanel";
import { __resetPanelTabsStoreForTests } from "../components/startScreen/panelTabsStore";
import { guidePanelContentStore } from "../components/guidePanelContentStore";

function createUseCaseStub() {
  return {
    getCategoriesWithoutGrade: vi.fn().mockReturnValue({}),
    getCategoriesForGrade: vi.fn().mockReturnValue({ addition: "たし算" }),
    getCategoryDescription: vi.fn().mockReturnValue("くり上がりのないたし算"),
    getCategoryGuideUrl: vi.fn(),
    getParentCategoryGuideUrl: vi.fn(),
    getTopCategoryGuideUrl: vi.fn(),
    getFirstAvailableGuideUrl: vi.fn(),
  };
}

describe("guidePanelUpdater", () => {
  function flush(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  beforeEach(() => {
    __resetPanelTabsStoreForTests();
    guidePanelContentStore.reset();
    const mount = document.createElement("div");
    mount.id = "quizPanelMount";
    document.body.appendChild(mount);
    flushSync(() => createRoot(mount).render(React.createElement(QuizPanel)));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("学年ガイド表示時にトークンを進め学年ガイドを描画する", async () => {
    let currentToken = 0;
    const tokenRef = {
      nextToken: () => ++currentToken,
      currentToken: () => currentToken,
    };
    const useCase = createUseCaseStub();

    await updateGuidePanelContentByIds(
      useCase as never,
      {
        selectedUnitContext: null,
        filter: { subject: "math", category: "all" },
        selectedTopCategoryId: null,
        selectedGradeGroup: "小学1年",
        selectionLevel: "none",
      },
      tokenRef,
      "guidePanelFrame",
      "guideNoContent",
    );

    const guideFrame = document.getElementById("guidePanelFrame") as HTMLElement;
    expect(currentToken).toBe(1);
    expect(guideFrame.textContent).toContain("小学1年");
    expect(guideFrame.textContent).toContain("たし算");
  });

  it("進行中のガイド読込より後で学年ガイドを表示した場合は学年ガイドが維持される", async () => {
    let currentToken = 0;
    const tokenRef = {
      nextToken: () => ++currentToken,
      currentToken: () => currentToken,
    };
    const useCase = createUseCaseStub();

    let resolveFetch: ((value: Response) => void) | null = null;
    global.fetch = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    // guideLoader の loadGuideContent はスタンドアロン div を使う（後方互換）
    const tempFrame = document.createElement("div");
    const tempNoContent = document.createElement("div");
    document.body.appendChild(tempFrame);
    document.body.appendChild(tempNoContent);
    const pendingLoad = loadGuideContent(
      tempFrame,
      "../english/pronunciation/01-alphabet/guide",
      tokenRef,
      tempNoContent,
    );

    await updateGuidePanelContentByIds(
      useCase as never,
      {
        selectedUnitContext: null,
        filter: { subject: "math", category: "all" },
        selectedTopCategoryId: null,
        selectedGradeGroup: "小学1年",
        selectionLevel: "none",
      },
      tokenRef,
      "guidePanelFrame",
      "guideNoContent",
    );

    resolveFetch?.({
      ok: true,
      text: async () => "<html><body><main><p>外部ガイド</p></main></body></html>",
    } as Response);
    await pendingLoad;

    const guideFrame = document.getElementById("guidePanelFrame") as HTMLElement;
    expect(guideFrame.textContent).toContain("小学1年");
    expect(guideFrame.textContent).not.toContain("外部ガイド");
  });

  it("学年ガイド表示後に URL ガイドへ遷移すると同一 React マウントでガイドが描画される", async () => {
    let currentToken = 0;
    const tokenRef = {
      nextToken: () => ++currentToken,
      currentToken: () => currentToken,
    };
    const useCase = createUseCaseStub();
    useCase.getCategoryGuideUrl.mockReturnValue("../math/00-add/guide");

    // 1) 学年ガイドを React で描画する
    await updateGuidePanelContentByIds(
      useCase as never,
      {
        selectedUnitContext: null,
        filter: { subject: "math", category: "all" },
        selectedTopCategoryId: null,
        selectedGradeGroup: "小学1年",
        selectionLevel: "none",
      },
      tokenRef,
      "guidePanelFrame",
      "guideNoContent",
    );

    const guideFrame = document.getElementById("guidePanelFrame") as HTMLElement;
    expect(guideFrame.textContent).toContain("小学1年");

    // 2) URL ベースのガイドに遷移する（学年グループを解除して単元選択へ）
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "<html><body><main><h1>外部ガイド</h1></main></body></html>",
    } as unknown as Response);

    await updateGuidePanelContentByIds(
      useCase as never,
      {
        selectedUnitContext: { subject: "math", categoryId: "00-add" },
        filter: { subject: "math", category: "00-add" },
        selectedTopCategoryId: null,
        selectedGradeGroup: null,
        selectionLevel: "unit",
      },
      tokenRef,
      "guidePanelFrame",
      "guideNoContent",
    );
    await flush();
    // useEffect（fetch）を含む非同期処理を完全にフラッシュする
    await act(async () => {});
    await act(async () => {});

    // React マウントを維持したまま、同一ルートで URL ガイドへ切り替わる
    expect(guideFrame.textContent).not.toContain("小学1年");
    expect(guideFrame.textContent).toContain("外部ガイド");
  });
});
