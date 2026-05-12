// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { setupFontSizeListeners } from "./eventListeners";

describe("setupFontSizeListeners", () => {
  it("フォントサイズボタンが再描画されてもクリックイベントを処理できる", () => {
    document.body.innerHTML = `
      <div id="fontSizeBtns">
        <button class="font-size-btn" data-size="medium">中</button>
      </div>
    `;
    const onSelect = vi.fn();
    setupFontSizeListeners(onSelect);

    document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="medium"]')?.click();

    const container = document.getElementById("fontSizeBtns");
    if (!container) throw new Error("fontSizeBtns が見つかりません");
    container.innerHTML = `<button class="font-size-btn" data-size="large">大</button>`;
    document.querySelector<HTMLButtonElement>('.font-size-btn[data-size="large"]')?.click();

    expect(onSelect).toHaveBeenNthCalledWith(1, "medium");
    expect(onSelect).toHaveBeenNthCalledWith(2, "large");
  });
});
