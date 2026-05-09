/**
 * panelTabsStore のテスト。
 *
 * - 状態の初期値
 * - 同じ値で setter を呼んでも notify されない（重複 notify 抑制）
 * - React listener と side-effect listener の独立性
 * - unsubscribe で listener が解除される
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetPanelTabsStoreForTests,
  getPanelTabsSnapshot,
  setActiveOverallPanel,
  setActivePanelTab,
  setActiveProgressDetailMode,
  setHiddenPanelTabs,
  subscribeOverallPanelSideEffect,
  subscribePanelTabSideEffect,
  subscribePanelTabsStore,
  subscribeProgressDetailSideEffect,
} from "./panelTabsStore";

afterEach(() => {
  __resetPanelTabsStoreForTests();
});

describe("panelTabsStore", () => {
  it("初期状態は quiz / learned / grade", () => {
    const s = getPanelTabsSnapshot();
    expect(s.activePanelTab).toBe("quiz");
    expect(s.activeOverallPanel).toBe("learned");
    expect(s.activeProgressDetailMode).toBe("grade");
  });

  it("setActivePanelTab で React listener と side-effect listener の両方が発火する", () => {
    const reactCb = vi.fn();
    const sideCb = vi.fn();
    subscribePanelTabsStore(reactCb);
    subscribePanelTabSideEffect(sideCb);

    setActivePanelTab("guide");

    expect(getPanelTabsSnapshot().activePanelTab).toBe("guide");
    expect(reactCb).toHaveBeenCalledTimes(1);
    expect(sideCb).toHaveBeenCalledWith("guide");
  });

  it("同じ値で setActivePanelTab を呼んでも notify されない", () => {
    const reactCb = vi.fn();
    const sideCb = vi.fn();
    subscribePanelTabsStore(reactCb);
    subscribePanelTabSideEffect(sideCb);

    setActivePanelTab("quiz"); // 初期値と同じ
    expect(reactCb).not.toHaveBeenCalled();
    expect(sideCb).not.toHaveBeenCalled();
  });

  it("setActiveOverallPanel は overallPanel listener のみを呼ぶ（panelTab listener には伝播しない）", () => {
    const overallCb = vi.fn();
    const panelTabCb = vi.fn();
    subscribeOverallPanelSideEffect(overallCb);
    subscribePanelTabSideEffect(panelTabCb);

    setActiveOverallPanel("share");

    expect(overallCb).toHaveBeenCalledWith("share");
    expect(panelTabCb).not.toHaveBeenCalled();
  });

  it("setActiveProgressDetailMode は progressDetail listener のみを呼ぶ", () => {
    const progressCb = vi.fn();
    const overallCb = vi.fn();
    subscribeProgressDetailSideEffect(progressCb);
    subscribeOverallPanelSideEffect(overallCb);

    setActiveProgressDetailMode("matrix");

    expect(progressCb).toHaveBeenCalledWith("matrix");
    expect(overallCb).not.toHaveBeenCalled();
  });

  it("subscribe の戻り値で listener を解除できる", () => {
    const cb = vi.fn();
    const unsub = subscribePanelTabsStore(cb);

    setActivePanelTab("history");
    expect(cb).toHaveBeenCalledTimes(1);

    unsub();
    setActivePanelTab("questions");
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("setHiddenPanelTabs はストアの hiddenPanelTabs を更新し React listener を呼ぶ", () => {
    const cb = vi.fn();
    subscribePanelTabsStore(cb);

    setHiddenPanelTabs(["guide", "quiz"]);

    const s = getPanelTabsSnapshot();
    expect(s.hiddenPanelTabs.has("guide")).toBe(true);
    expect(s.hiddenPanelTabs.has("quiz")).toBe(true);
    expect(s.hiddenPanelTabs.has("history")).toBe(false);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("setHiddenPanelTabs は同じ集合で呼ばれた場合 notify しない", () => {
    setHiddenPanelTabs(["guide"]);
    const cb = vi.fn();
    subscribePanelTabsStore(cb);

    setHiddenPanelTabs(["guide"]);

    expect(cb).not.toHaveBeenCalled();
  });
});
