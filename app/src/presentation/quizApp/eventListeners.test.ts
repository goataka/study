// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { setupFontSizeListeners, setupHeaderListeners } from "./eventListeners";

describe("QuizApp — フォントサイズ切替イベント仕様", () => {
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

describe("QuizApp — ヘッダーイベント仕様", () => {
  it("appNameLink をクリックするとスタート画面遷移コールバックを呼ぶ", () => {
    document.body.innerHTML = `
      <button id="appNameLink" type="button">Open Study Text 小中高</button>
    `;
    const onTitleClick = vi.fn();

    setupHeaderListeners({
      onTitleClick,
      onOpenUserNameEdit: vi.fn(),
      onSaveUserName: vi.fn(),
      onCancelUserName: vi.fn(),
      onAdminMenuClick: vi.fn(),
    });

    document.getElementById("appNameLink")?.click();

    expect(onTitleClick).toHaveBeenCalledTimes(1);
  });

  it("appNameLink で Enter / Space キー押下時にスタート画面遷移コールバックを呼ぶ", () => {
    document.body.innerHTML = `
      <button id="appNameLink" type="button">Open Study Text 小中高</button>
    `;
    const onTitleClick = vi.fn();

    setupHeaderListeners({
      onTitleClick,
      onOpenUserNameEdit: vi.fn(),
      onSaveUserName: vi.fn(),
      onCancelUserName: vi.fn(),
      onAdminMenuClick: vi.fn(),
    });

    const appNameLink = document.getElementById("appNameLink");
    appNameLink?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    appNameLink?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));

    expect(onTitleClick).toHaveBeenCalledTimes(2);
  });
});
