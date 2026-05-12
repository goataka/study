// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { getFontSizeSnapshot, setFontSizeLevel, subscribeFontSizeStore, syncFontSizeDom } from "./fontSizeStore";

describe("fontSizeStore", () => {
  it("setFontSizeLevel でスナップショットが更新される", () => {
    setFontSizeLevel("small");
    setFontSizeLevel("large");
    expect(getFontSizeSnapshot()).toBe("large");
  });

  it("値が変わったときだけ購読者に通知する", () => {
    setFontSizeLevel("small");
    const listener = vi.fn();
    const unsubscribe = subscribeFontSizeStore(listener);

    setFontSizeLevel("small");
    setFontSizeLevel("medium");

    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("syncFontSizeDom は html の font-size をレベルに応じて更新する", () => {
    syncFontSizeDom("medium");
    expect(document.documentElement.style.fontSize).toBe("120%");

    syncFontSizeDom("large");
    expect(document.documentElement.style.fontSize).toBe("150%");

    syncFontSizeDom("small");
    expect(document.documentElement.style.fontSize).toBe("100%");
  });
});
