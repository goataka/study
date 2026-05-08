// @vitest-environment jsdom

import type { IProgressRepository } from "../application/ports";
import { AvatarController } from "./avatarController";

describe("AvatarController", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = `
      <button id="headerUserAvatar"></button>
      <img id="headerUserAvatarImg" />
      <span id="headerUserAvatarPlaceholder"></span>
      <dialog id="avatarCropDialog">
        <div id="avatarCropPreviewWrap">
          <img id="avatarCropPreview" />
          <span id="avatarCropPreviewPlaceholder"></span>
        </div>
        <input id="avatarCropZoom" type="range" value="1" min="1" max="3" step="0.05" />
      </dialog>
    `;
    const dialog = document.getElementById("avatarCropDialog") as HTMLDialogElement;
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();
    const wrap = document.getElementById("avatarCropPreviewWrap") as HTMLDivElement;
    wrap.getBoundingClientRect = () =>
      ({
        width: 120,
        height: 120,
        top: 0,
        left: 0,
        right: 120,
        bottom: 120,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
  });

  it("マウスドラッグでもプレビュー画像の表示位置を移動できる", () => {
    const originalPointerEvent = window.PointerEvent;
    // PointerEvent 非対応環境のフォールバックとして mouse 系イベントが動作することを検証する
    Object.defineProperty(window, "PointerEvent", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      const repo = {
        loadUserAvatar: () => "data:image/png;base64,AAA",
        saveUserAvatar: vi.fn(),
      } as unknown as IProgressRepository;
      const controller = new AvatarController(repo);
      controller.loadFromStorage();
      controller.openCropDialog();

      const wrap = document.getElementById("avatarCropPreviewWrap") as HTMLDivElement;
      const preview = document.getElementById("avatarCropPreview") as HTMLImageElement;

      wrap.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 60, clientY: 60, button: 0 }));
      document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 84, clientY: 72 }));
      document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

      expect(preview.style.objectPosition).not.toBe("50% 50%");
    } finally {
      Object.defineProperty(window, "PointerEvent", {
        configurable: true,
        writable: true,
        value: originalPointerEvent,
      });
    }
  });
});
