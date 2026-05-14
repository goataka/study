/**
 * confirmDialogStore — 仕様テスト。
 *
 * 外部ストアと `<ConfirmDialog>` 経由の Promise ベース API を検証する。
 * 単体（ストアのみ）の動作と、`#confirmDialog` 要素の有無による
 * フォールバック挙動を網羅する。
 */

// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetConfirmDialogStoreForTests,
  getSnapshot,
  getSubscriberCount,
  openConfirmDialog,
  resolveConfirmDialog,
  subscribe,
} from "./confirmDialogStore";

describe("confirmDialogStore — 仕様", () => {
  beforeEach(() => {
    __resetConfirmDialogStoreForTests();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("初期状態は閉じている", () => {
    expect(getSnapshot()).toEqual({ open: false, message: "", alertOnly: false });
  });

  it("subscribe / unsubscribe で subscriber 数が増減する", () => {
    expect(getSubscriberCount()).toBe(0);
    const unsub = subscribe(() => {});
    expect(getSubscriberCount()).toBe(1);
    unsub();
    expect(getSubscriberCount()).toBe(0);
  });

  describe("openConfirmDialog 関数", () => {
    it("subscriber がなければ window.confirm にフォールバックする", async () => {
      const spy = vi.spyOn(window, "confirm").mockReturnValue(true);
      const result = await openConfirmDialog("ほんとうに？");
      expect(spy).toHaveBeenCalledWith("ほんとうに？");
      expect(result).toBe(true);
    });

    it("alertOnly=true で subscriber がなければ window.alert にフォールバックし true を返す", async () => {
      const spy = vi.spyOn(window, "alert").mockImplementation(() => {});
      const result = await openConfirmDialog("おしらせ", true);
      expect(spy).toHaveBeenCalledWith("おしらせ");
      expect(result).toBe(true);
    });

    it("subscriber があっても DOM 上に #confirmDialog が無ければフォールバックする", async () => {
      subscribe(() => {});
      const spy = vi.spyOn(window, "confirm").mockReturnValue(false);
      const result = await openConfirmDialog("どうする？");
      expect(spy).toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it("subscriber と #confirmDialog が揃っていればストアを open に更新し subscriber に通知する", () => {
      const root = document.createElement("div");
      root.id = "confirmDialog";
      document.body.appendChild(root);

      const listener = vi.fn();
      subscribe(listener);

      void openConfirmDialog("メッセージ", false);
      expect(getSnapshot()).toEqual({ open: true, message: "メッセージ", alertOnly: false });
      expect(listener).toHaveBeenCalled();
    });
  });

  describe("resolveConfirmDialog 関数", () => {
    beforeEach(() => {
      const root = document.createElement("div");
      root.id = "confirmDialog";
      document.body.appendChild(root);
    });

    it("Promise を指定の値で解決し閉じる", async () => {
      subscribe(() => {});
      const promise = openConfirmDialog("ok?", false);
      resolveConfirmDialog(true);
      await expect(promise).resolves.toBe(true);
      expect(getSnapshot()).toEqual({ open: false, message: "", alertOnly: false });
    });

    it("二重 open の場合、前の Promise を false で解決して新しいダイアログに置き換える", async () => {
      subscribe(() => {});
      const first = openConfirmDialog("一回目", false);
      const second = openConfirmDialog("二回目", false);
      resolveConfirmDialog(true);
      await expect(first).resolves.toBe(false);
      await expect(second).resolves.toBe(true);
    });
  });
});
