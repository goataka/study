// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { OuterBottomRow } from "./OuterBottomRow";

describe("OuterBottomRow", () => {
  let container: HTMLElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });

  it("rcリンク押下時に確認ダイアログを表示し、キャンセル時は遷移しない", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    flushSync(() => root.render(<OuterBottomRow />));

    const rcLink = Array.from(container.querySelectorAll("a")).find((el) => el.textContent?.trim() === "rc");
    expect(rcLink).not.toBeUndefined();

    const clickResult = rcLink!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(confirmSpy).toHaveBeenCalledWith("rc 環境へ切り替えます。よろしいですか？");
    expect(clickResult).toBe(false);
  });

  it("確認OK時は遷移をキャンセルしない", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    flushSync(() => root.render(<OuterBottomRow />));

    const rcLink = Array.from(container.querySelectorAll("a")).find((el) => el.textContent?.trim() === "rc");
    expect(rcLink).not.toBeUndefined();

    const clickResult = rcLink!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(clickResult).toBe(true);
  });
});
