/**
 * <ConfirmDialog> 仕様テスト。
 *
 * React `useSyncExternalStore` を介してストアの状態を反映できるか、
 * クリック / キーボード操作で正しく Promise を解決するかを検証する。
 */

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { ConfirmDialog } from "./ConfirmDialog";
import { __resetConfirmDialogStoreForTests, openConfirmDialog } from "./confirmDialogStore";

let container: HTMLDivElement;
let root: Root;

function mount(): void {
  __resetConfirmDialogStoreForTests();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  flushSync(() => {
    root.render(<ConfirmDialog />);
  });
}

function flush(): void {
  flushSync(() => {});
}

describe("<ConfirmDialog>", () => {
  beforeEach(() => {
    mount();
  });

  afterEach(() => {
    flushSync(() => root.unmount());
    container.remove();
    __resetConfirmDialogStoreForTests();
  });

  it("初期は hidden クラスが付き表示されない", () => {
    const overlay = document.getElementById("confirmDialog");
    expect(overlay?.classList.contains("hidden")).toBe(true);
  });

  it("openConfirmDialog でメッセージを表示し hidden が外れる", () => {
    void openConfirmDialog("ほんとうに？", false);
    flush();
    const overlay = document.getElementById("confirmDialog");
    const msg = document.getElementById("confirmDialogMessage");
    expect(overlay?.classList.contains("hidden")).toBe(false);
    expect(msg?.textContent).toBe("ほんとうに？");
  });

  it("alertOnly=true のときキャンセルボタンに hidden クラスが付く", () => {
    void openConfirmDialog("おしらせ", true);
    flush();
    const cancel = document.getElementById("confirmDialogCancel");
    expect(cancel?.classList.contains("hidden")).toBe(true);
  });

  it("OK クリックで Promise が true で解決し閉じる", async () => {
    const promise = openConfirmDialog("ok?", false);
    flush();
    document.getElementById("confirmDialogOk")?.click();
    await expect(promise).resolves.toBe(true);
    flush();
    expect(document.getElementById("confirmDialog")?.classList.contains("hidden")).toBe(true);
  });

  it("キャンセルクリックで Promise が false で解決し閉じる", async () => {
    const promise = openConfirmDialog("ok?", false);
    flush();
    document.getElementById("confirmDialogCancel")?.click();
    await expect(promise).resolves.toBe(false);
    flush();
    expect(document.getElementById("confirmDialog")?.classList.contains("hidden")).toBe(true);
  });

  it("open 直後に OK ボタンへフォーカスが移る", () => {
    void openConfirmDialog("ok?", false);
    flush();
    expect(document.activeElement?.id).toBe("confirmDialogOk");
  });

  it("Esc で alertOnly=false なら false で解決する", async () => {
    const promise = openConfirmDialog("どうする？", false);
    flush();
    const overlay = document.getElementById("confirmDialog");
    overlay?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(promise).resolves.toBe(false);
  });

  it("Esc で alertOnly=true なら true で解決する", async () => {
    const promise = openConfirmDialog("おしらせ", true);
    flush();
    const overlay = document.getElementById("confirmDialog");
    overlay?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(promise).resolves.toBe(true);
  });

  it("Tab で OK → キャンセル → OK と循環フォーカスする（フォーカストラップ）", () => {
    void openConfirmDialog("ok?", false);
    flush();
    const ok = document.getElementById("confirmDialogOk");
    const cancel = document.getElementById("confirmDialogCancel");
    const overlay = document.getElementById("confirmDialog");

    // 初期は OK
    expect(document.activeElement).toBe(ok);
    overlay?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(cancel);
    overlay?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(ok);
  });

  it("alertOnly=true では Tab を押しても OK にフォーカスが固定される", () => {
    void openConfirmDialog("おしらせ", true);
    flush();
    const ok = document.getElementById("confirmDialogOk");
    const overlay = document.getElementById("confirmDialog");
    overlay?.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(ok);
  });
});
