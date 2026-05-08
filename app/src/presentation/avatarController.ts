/**
 * ヘッダーのユーザーアバター表示・編集ダイアログを担うコントローラー。
 *
 * QuizApp から肥大化していたアバター関連のフィールドとメソッドを切り出したもの。
 *
 * クリーンアーキテクチャ上の位置付け:
 * - presentation 層に属し、IProgressRepository を経由してのみ永続化する。
 */

import type { IProgressRepository } from "../application/ports";

export class AvatarController {
  /** 保存済みアバター画像（data:URL）。未設定なら null。 */
  private dataUrl: string | null = null;
  /** アバター画像の表示位置（0〜100 のパーセント） */
  private cropX: number = 50;
  private cropY: number = 50;
  /** アバター画像の拡大率 */
  private zoom: number = 1;
  /** ダイアログで選択中の表示位置・拡大率（確定前） */
  private pendingCropX: number = 50;
  private pendingCropY: number = 50;
  private pendingZoom: number = 1;
  /** ダイアログで選択中の画像（確定前） */
  private pendingDataUrl: string | null = null;
  /** クロップダイアログのドラッグイベント解除用 AbortController */
  private dragAbortController: AbortController | null = null;

  constructor(private readonly progressRepo: IProgressRepository) {}

  /**
   * 永続化レイヤーから現在のアバター画像と表示状態を読み込む。
   * 旧フォーマット "top/center/bottom" も互換のため変換する。
   */
  loadFromStorage(): void {
    const stored = this.progressRepo.loadUserAvatar();
    // data:image/ スキームのみ許可（外部URLや壊れたデータを除外）
    this.dataUrl = stored && stored.startsWith("data:image/") ? stored : null;
    try {
      const xPos = parseFloat(localStorage.getItem("avatarCropPositionX") ?? "50");
      const yPos = localStorage.getItem("avatarCropPosition");
      const zoom = parseFloat(localStorage.getItem("avatarCropZoom") ?? "1");
      if (!isNaN(xPos) && xPos >= 0 && xPos <= 100) this.cropX = xPos;
      if (yPos !== null) {
        const yNum = parseFloat(yPos);
        if (!isNaN(yNum) && yNum >= 0 && yNum <= 100) {
          this.cropY = yNum;
        } else if (yPos === "top") {
          this.cropY = 0;
        } else if (yPos === "center") {
          this.cropY = 50;
        } else if (yPos === "bottom") {
          this.cropY = 100;
        }
      }
      if (!isNaN(zoom) && zoom >= 1 && zoom <= 3) this.zoom = zoom;
    } catch {
      /* noop */
    }
  }

  /** ヘッダーのアバター画像表示要素を最新状態に更新する。 */
  updateDisplay(): void {
    const img = document.getElementById("headerUserAvatarImg") as HTMLImageElement | null;
    const placeholder = document.getElementById("headerUserAvatarPlaceholder");
    if (!img || !placeholder) return;

    if (this.dataUrl) {
      img.src = this.dataUrl;
      img.classList.add("visible");
      placeholder.classList.add("hidden");
      img.style.objectPosition = `${this.cropX}% ${this.cropY}%`;
      img.style.transform = `scale(${this.zoom})`;
    } else {
      img.removeAttribute("src");
      img.classList.remove("visible");
      placeholder.classList.remove("hidden");
      img.style.transform = "";
    }
  }

  /** アバター画像選択・切り抜きダイアログを開く。 */
  openCropDialog(): void {
    const dialog = document.getElementById("avatarCropDialog") as HTMLDialogElement | null;
    if (!dialog) return;
    this.pendingCropX = this.cropX;
    this.pendingCropY = this.cropY;
    this.pendingZoom = this.zoom;
    // プレビューを現在の画像で初期化する
    this.pendingDataUrl = this.dataUrl;
    this.updateDialogPreview(this.dataUrl);
    this.setupCropDrag();
    dialog.showModal();
  }

  /** ダイアログで画像ファイルを選択したときのプレビュー処理。 */
  previewInDialog(file: File): void {
    if (!file.type.startsWith("image/")) return;
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert("画像ファイルサイズは5MB以下にしてください。");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result !== "string") return;
      this.pendingDataUrl = result;
      this.updateDialogPreview(result);
    };
    reader.readAsDataURL(file);
  }

  /** ダイアログ確定: 表示状態を反映し、画像を保存する。 */
  confirmCrop(): void {
    const dialog = document.getElementById("avatarCropDialog") as HTMLDialogElement | null;
    this.cropX = this.pendingCropX;
    this.cropY = this.pendingCropY;
    this.zoom = this.pendingZoom;
    try {
      localStorage.setItem("avatarCropPositionX", String(this.cropX));
      localStorage.setItem("avatarCropPosition", String(this.cropY));
      localStorage.setItem("avatarCropZoom", String(this.zoom));
    } catch {
      /* noop */
    }
    if (this.pendingDataUrl !== null) {
      this.dataUrl = this.pendingDataUrl;
      this.progressRepo.saveUserAvatar(this.pendingDataUrl);
      this.pendingDataUrl = null;
    }
    this.updateDisplay();
    dialog?.close();
  }

  /** ダイアログキャンセル: 編集中の画像を破棄する。 */
  cancelCrop(): void {
    this.pendingDataUrl = null;
  }

  /** ダイアログのプレビュー画像を更新する。 */
  private updateDialogPreview(dataUrl: string | null): void {
    const preview = document.getElementById("avatarCropPreview") as HTMLImageElement | null;
    const placeholder = document.getElementById("avatarCropPreviewPlaceholder");
    const zoomInput = document.getElementById("avatarCropZoom") as HTMLInputElement | null;
    if (!preview || !placeholder) return;
    if (zoomInput) zoomInput.value = String(this.pendingZoom);
    if (dataUrl) {
      preview.src = dataUrl;
      preview.classList.add("visible");
      placeholder.classList.add("hidden");
      preview.style.objectPosition = `${this.pendingCropX}% ${this.pendingCropY}%`;
      preview.style.transform = `scale(${this.pendingZoom})`;
    } else {
      preview.removeAttribute("src");
      preview.classList.remove("visible");
      placeholder.classList.remove("hidden");
      preview.style.transform = "";
    }
  }

  /**
   * アバタープレビュー上のドラッグハンドルを初期化する。
   * AbortController でクリーンアップを管理し、ダイアログを複数回開いても
   * イベントリスナーが重複しないようにする。
   */
  private setupCropDrag(): void {
    // 前回のリスナーをクリーンアップ
    this.dragAbortController?.abort();
    this.dragAbortController = new AbortController();
    const { signal } = this.dragAbortController;

    const wrap = document.getElementById("avatarCropPreviewWrap");
    const zoomInput = document.getElementById("avatarCropZoom") as HTMLInputElement | null;
    const preview = document.getElementById("avatarCropPreview") as HTMLImageElement | null;
    if (!wrap || !preview) return;

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let startCropX = 50;
    let startCropY = 50;

    const getPctDelta = (dx: number, dy: number): { x: number; y: number } => {
      const rect = wrap.getBoundingClientRect();
      // 拡大率が高いほど、同じピクセル移動での見た目の変化量が大きくなるためデルタを縮小する
      const zoom = Math.max(this.pendingZoom, 1);
      const x = (dx / rect.width) * (100 / zoom);
      const y = (dy / rect.height) * (100 / zoom);
      return { x, y };
    };

    const updatePreview = (): void => {
      preview.style.objectPosition = `${this.pendingCropX}% ${this.pendingCropY}%`;
      preview.style.transform = `scale(${this.pendingZoom})`;
    };

    const startDrag = (clientX: number, clientY: number): void => {
      if (!this.pendingDataUrl) return;
      dragging = true;
      wrap.classList.add("dragging");
      startX = clientX;
      startY = clientY;
      startCropX = this.pendingCropX;
      startCropY = this.pendingCropY;
    };

    const moveDrag = (clientX: number, clientY: number): void => {
      if (!dragging) return;
      const { x, y } = getPctDelta(clientX - startX, clientY - startY);
      // 画像を右/下にドラッグした時は表示位置を逆方向へ動かす
      this.pendingCropX = Math.max(0, Math.min(100, startCropX - x));
      this.pendingCropY = Math.max(0, Math.min(100, startCropY - y));
      updatePreview();
    };

    const endDrag = (): void => {
      dragging = false;
      wrap.classList.remove("dragging");
    };

    let activePointerId: number | null = null;
    let mouseDragging = false;
    const getTouchPoint = (e: TouchEvent): Touch | null => e.touches[0] ?? e.changedTouches[0] ?? null;
    const hasPointerEvent = typeof window !== "undefined" && "PointerEvent" in window;
    if (hasPointerEvent) {
      wrap.addEventListener(
        "pointerdown",
        (e: PointerEvent) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          activePointerId = e.pointerId;
          startDrag(e.clientX, e.clientY);
          try {
            wrap.setPointerCapture(e.pointerId);
          } catch {
            // ブラウザ実装差異で失敗する場合があるため継続する
          }
        },
        { signal },
      );

      document.addEventListener(
        "pointermove",
        (e: PointerEvent) => {
          if (!dragging || activePointerId !== e.pointerId) return;
          e.preventDefault();
          moveDrag(e.clientX, e.clientY);
        },
        { signal, passive: false },
      );

      const onPointerUp = (e: PointerEvent): void => {
        if (activePointerId !== null && activePointerId !== e.pointerId) return;
        activePointerId = null;
        endDrag();
      };

      document.addEventListener("pointerup", onPointerUp, { signal });
      document.addEventListener("pointercancel", onPointerUp, { signal });
    } else {
      wrap.addEventListener(
        "mousedown",
        (e: MouseEvent) => {
          if (e.button !== 0) return;
          mouseDragging = true;
          startDrag(e.clientX, e.clientY);
        },
        { signal },
      );

      document.addEventListener(
        "mousemove",
        (e: MouseEvent) => {
          if (!mouseDragging) return;
          e.preventDefault();
          moveDrag(e.clientX, e.clientY);
        },
        { signal, passive: false },
      );

      document.addEventListener(
        "mouseup",
        () => {
          mouseDragging = false;
          endDrag();
        },
        { signal },
      );

      wrap.addEventListener(
        "touchstart",
        (e: TouchEvent) => {
          const touch = getTouchPoint(e);
          if (!touch) return;
          startDrag(touch.clientX, touch.clientY);
        },
        { signal, passive: true },
      );

      document.addEventListener(
        "touchmove",
        (e: TouchEvent) => {
          if (!dragging) return;
          const touch = getTouchPoint(e);
          if (!touch) return;
          e.preventDefault();
          moveDrag(touch.clientX, touch.clientY);
        },
        { signal, passive: false },
      );

      document.addEventListener(
        "touchend",
        () => {
          endDrag();
        },
        { signal },
      );
      document.addEventListener(
        "touchcancel",
        () => {
          endDrag();
        },
        { signal },
      );
    }

    zoomInput?.addEventListener(
      "input",
      () => {
        const zoom = parseFloat(zoomInput.value);
        if (!isNaN(zoom)) {
          this.pendingZoom = Math.max(1, Math.min(3, zoom));
          updatePreview();
        }
      },
      { signal },
    );

    // ダイアログが閉じたときにクリーンアップ
    const dialog = wrap.closest("dialog");
    if (dialog) {
      dialog.addEventListener(
        "close",
        () => {
          this.dragAbortController?.abort();
          this.dragAbortController = null;
        },
        { once: true },
      );
    }
  }
}
