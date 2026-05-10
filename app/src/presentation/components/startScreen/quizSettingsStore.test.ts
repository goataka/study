import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetQuizSettingsStoreForTests,
  getQuizSettingsSnapshot,
  setQuizSettings,
  subscribeQuizSettingsStore,
} from "./quizSettingsStore";

afterEach(() => {
  __resetQuizSettingsStoreForTests();
});

describe("quizSettingsStore", () => {
  it("初期値は 10問 / random / 学習済を含めない", () => {
    const s = getQuizSettingsSnapshot();
    expect(s.questionCount).toBe(10);
    expect(s.quizOrder).toBe("random");
    expect(s.includeMastered).toBe(false);
  });

  it("setQuizSettings で部分更新できる", () => {
    setQuizSettings({ questionCount: 20 });
    const s = getQuizSettingsSnapshot();
    expect(s.questionCount).toBe(20);
    expect(s.quizOrder).toBe("random");
    expect(s.includeMastered).toBe(false);
  });

  it("setQuizSettings は値が変わらない場合 listener を呼ばない", () => {
    setQuizSettings({ questionCount: 20 });
    const cb = vi.fn();
    subscribeQuizSettingsStore(cb);
    setQuizSettings({ questionCount: 20 });
    expect(cb).not.toHaveBeenCalled();
  });

  it("setQuizSettings は値が変わると listener を呼ぶ", () => {
    const cb = vi.fn();
    subscribeQuizSettingsStore(cb);
    setQuizSettings({ quizOrder: "straight" });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("subscribe の戻り値で解除できる", () => {
    const cb = vi.fn();
    const unsub = subscribeQuizSettingsStore(cb);
    setQuizSettings({ includeMastered: true });
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    setQuizSettings({ includeMastered: false });
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
