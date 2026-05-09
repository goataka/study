// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyFontSizeToDom, type FontSizeLevel } from "./fontSizeManager";

describe("fontSizeManager", () => {
  beforeEach(() => {
    document.body.className = "";
    document.body.innerHTML = `
      <button class="font-size-btn" data-size="small" aria-pressed="false"></button>
      <button class="font-size-btn" data-size="medium" aria-pressed="false"></button>
      <button class="font-size-btn" data-size="large" aria-pressed="false"></button>
    `;
  });

  it("small ではサイズクラスを付与せず small ボタンだけが active になる", () => {
    applyFontSizeToDom("small", false, () => undefined);
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
    expect(document.body.classList.contains("font-size-large")).toBe(false);

    const btns = document.querySelectorAll<HTMLButtonElement>(".font-size-btn");
    expect(btns[0].classList.contains("active")).toBe(true);
    expect(btns[0].getAttribute("aria-pressed")).toBe("true");
    expect(btns[1].classList.contains("active")).toBe(false);
    expect(btns[1].getAttribute("aria-pressed")).toBe("false");
  });

  it("medium で body に font-size-medium が付き対応ボタンが active になる", () => {
    applyFontSizeToDom("medium", false, () => undefined);
    expect(document.body.classList.contains("font-size-medium")).toBe(true);
    expect(document.body.classList.contains("font-size-large")).toBe(false);

    const mediumBtn = document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]');
    expect(mediumBtn?.classList.contains("active")).toBe(true);
  });

  it("large で body に font-size-large が付き medium クラスは除去される", () => {
    applyFontSizeToDom("medium", false, () => undefined);
    applyFontSizeToDom("large", false, () => undefined);
    expect(document.body.classList.contains("font-size-medium")).toBe(false);
    expect(document.body.classList.contains("font-size-large")).toBe(true);
  });

  it("persist=true のとき onPersist が現在のレベルで呼ばれる", () => {
    const onPersist = vi.fn<(level: FontSizeLevel) => void>();
    applyFontSizeToDom("large", true, onPersist);
    expect(onPersist).toHaveBeenCalledTimes(1);
    expect(onPersist).toHaveBeenCalledWith("large");
  });

  it("persist=false のとき onPersist は呼ばれない", () => {
    const onPersist = vi.fn();
    applyFontSizeToDom("medium", false, onPersist);
    expect(onPersist).not.toHaveBeenCalled();
  });
});
