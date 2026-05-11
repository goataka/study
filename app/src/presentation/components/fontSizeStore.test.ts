// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { getFontSizeSnapshot, setFontSizeLevel, subscribeFontSizeStore } from "./fontSizeStore";

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
});
