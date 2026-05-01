/**
 * NotesCanvas — キャンバス描画機能を管理するクラス。
 * タッチペン・マウス両方に対応した描画機能を提供する。
 */

export interface DrawingState {
  dataUrl: string;
}

export class NotesCanvas {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  private penSize = 5;
  private penColor = "#000000";
  private eraserMode = false;
  private restoreToken = 0;
  private static readonly ERASER_SIZE_MULTIPLIER = 4;

  // ─── 初期化 ────────────────────────────────────────────────────────────────

  public initialize(canvasId: string): void {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!this.canvas) {
      console.warn(`指定したIDのcanvas要素が見つかりません: ${canvasId}`);
      return;
    }

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      console.warn("canvas要素から2Dコンテキストを取得できませんでした");
      return;
    }

    this.setupCanvas();
    this.attachEventListeners();
  }

  private setupCanvas(): void {
    if (!this.canvas || !this.ctx) return;

    // CSS zoom が html 要素に適用されると getBoundingClientRect は
    // ブラウザによりズーム考慮済みの視覚座標を返す場合があるため、
    // CSS ピクセル幅/高さは offsetWidth/offsetHeight から取得する（常に CSS ピクセル）
    const dpr = window.devicePixelRatio || 1;
    const cssWidth = this.canvas.offsetWidth || 1;
    const cssHeight = this.canvas.offsetHeight || 1;

    this.canvas.width = cssWidth * dpr;
    this.canvas.height = cssHeight * dpr;

    this.ctx.scale(dpr, dpr);

    // 描画設定
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  // ─── イベントハンドラー ────────────────────────────────────────────────────

  private attachEventListeners(): void {
    if (!this.canvas) return;

    // マウスイベント
    this.canvas.addEventListener("mousedown", this.handleStart.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleEnd.bind(this));
    this.canvas.addEventListener("mouseout", this.handleEnd.bind(this));

    // タッチイベント
    this.canvas.addEventListener("touchstart", this.handleStart.bind(this), { passive: false });
    this.canvas.addEventListener("touchmove", this.handleMove.bind(this), { passive: false });
    this.canvas.addEventListener("touchend", this.handleEnd.bind(this));
    this.canvas.addEventListener("touchcancel", this.handleEnd.bind(this));

    // リサイズ対応
    window.addEventListener("resize", () => {
      const state = this.save();
      this.setupCanvas();
      if (state) {
        this.restore(state);
      }
    });
  }

  private handleStart(e: MouseEvent | TouchEvent): void {
    e.preventDefault();
    this.isDrawing = true;

    const coords = this.getCoordinates(e);
    this.lastX = coords.x;
    this.lastY = coords.y;
  }

  private handleMove(e: MouseEvent | TouchEvent): void {
    if (!this.isDrawing || !this.ctx) return;

    e.preventDefault();
    const coords = this.getCoordinates(e);

    this.ctx.beginPath();
    if (this.eraserMode) {
      this.ctx.globalCompositeOperation = "destination-out";
      this.ctx.lineWidth = this.penSize * NotesCanvas.ERASER_SIZE_MULTIPLIER;
    } else {
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.strokeStyle = this.penColor;
      this.ctx.lineWidth = this.penSize;
    }
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(coords.x, coords.y);
    this.ctx.stroke();
    this.ctx.globalCompositeOperation = "source-over";

    this.lastX = coords.x;
    this.lastY = coords.y;
  }

  private handleEnd(e: MouseEvent | TouchEvent): void {
    if (this.isDrawing) {
      e.preventDefault();
    }
    this.isDrawing = false;
  }

  private getCoordinates(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };

    const rect = this.canvas.getBoundingClientRect();
    let clientX: number;
    let clientY: number;

    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      // TouchEvent
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return { x: 0, y: 0 };
      clientX = touch.clientX;
      clientY = touch.clientY;
    }

    // CSS zoom が document.documentElement に適用されると、ブラウザのバージョンによって
    // getBoundingClientRect が CSS 座標（ズーム非考慮）または視覚座標（ズーム考慮）を返す。
    // zoom: html 要素に設定されている CSS zoom 値（なければ 1.0）
    // bcrIsZoomAware: rect.width が offsetWidth × zoom に近い場合は BCR がズーム考慮済み
    const zoom = parseFloat(document.documentElement.style.zoom || "1") || 1;
    const offsetWidth = this.canvas.offsetWidth || 1;
    const bcrIsZoomAware = zoom !== 1 && Math.abs(rect.width / offsetWidth - zoom) < 0.08;

    // 視覚座標系でのキャンバス左上隅位置
    const canvasLeft = bcrIsZoomAware ? rect.left : rect.left * zoom;
    const canvasTop = bcrIsZoomAware ? rect.top : rect.top * zoom;

    // 視覚オフセットを CSS ピクセルに変換して描画座標を求める
    return {
      x: (clientX - canvasLeft) / zoom,
      y: (clientY - canvasTop) / zoom,
    };
  }

  // ─── 設定変更 ──────────────────────────────────────────────────────────────

  public setPenSize(size: number): void {
    this.penSize = size;
  }

  public setPenColor(color: string): void {
    this.penColor = color;
  }

  public setEraserMode(enabled: boolean): void {
    this.eraserMode = enabled;
  }

  public get isEraserMode(): boolean {
    return this.eraserMode;
  }

  // ─── キャンバス操作 ────────────────────────────────────────────────────────

  public clear(): void {
    if (!this.canvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
  }

  public save(): DrawingState | null {
    if (!this.canvas) return null;

    return {
      dataUrl: this.canvas.toDataURL(),
    };
  }

  public restore(state: DrawingState): void {
    if (!this.canvas || !this.ctx) return;

    const token = ++this.restoreToken;
    const img = new Image();
    img.onload = () => {
      if (!this.ctx || !this.canvas) return;
      if (token !== this.restoreToken) return; // 古い呼び出しはスキップ
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(img, 0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
    };
    img.src = state.dataUrl;
  }

  // ─── クリーンアップ ────────────────────────────────────────────────────────

  public destroy(): void {
    // イベントリスナーの削除は省略（ページ遷移時に自動的に解放される）
    this.canvas = null;
    this.ctx = null;
  }
}
