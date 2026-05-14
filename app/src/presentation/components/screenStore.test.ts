// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetScreenStoreForTests,
  getScreenSnapshot,
  setCurrentScreen,
  subscribeScreenStore,
  getScreenNameFromHistoryState,
} from "./screenStore";

describe("screenStore ストア", () => {
  beforeEach(() => {
    __resetScreenStoreForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("autoモードでは quiz/result は push、start は replace で履歴を更新する", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    setCurrentScreen("quiz");
    setCurrentScreen("result");
    setCurrentScreen("start");

    expect(pushSpy).toHaveBeenCalledTimes(2);
    expect(pushSpy).toHaveBeenNthCalledWith(1, { screen: "quiz" }, document.title);
    expect(pushSpy).toHaveBeenNthCalledWith(2, { screen: "result" }, document.title);
    expect(replaceSpy).toHaveBeenCalledWith({ screen: "start" }, document.title);
  });

  it("history=none では履歴を更新せず、状態のみ切り替える", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    setCurrentScreen("quiz", { history: "none" });

    expect(getScreenSnapshot()).toBe("quiz");
    expect(pushSpy).not.toHaveBeenCalled();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("同一画面への切り替えでは通知しない", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeScreenStore(listener);

    setCurrentScreen("start", { history: "none" });
    setCurrentScreen("quiz", { history: "none" });
    setCurrentScreen("quiz", { history: "none" });

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("同一画面への切り替えでは履歴も更新しない", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    setCurrentScreen("start");
    setCurrentScreen("quiz");
    setCurrentScreen("quiz");

    expect(pushSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("history state から画面名を正規化できる", () => {
    expect(getScreenNameFromHistoryState({ screen: "quiz" })).toBe("quiz");
    expect(getScreenNameFromHistoryState({ screen: "result" })).toBe("result");
    expect(getScreenNameFromHistoryState({ screen: "invalid" })).toBe("start");
    expect(getScreenNameFromHistoryState(null)).toBe("start");
  });
});
