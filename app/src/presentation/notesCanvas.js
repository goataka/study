/**
 * NotesCanvas — キャンバス描画機能を管理するクラス。
 * タッチペン・マウス両方に対応した描画機能を提供する。
 */
export class NotesCanvas {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.penSize = 5;
        this.penColor = "#000000";
        this.eraserMode = false;
        this.restoreToken = 0;
    }
    // ─── 初期化 ────────────────────────────────────────────────────────────────
    initialize(canvasId) {
        this.canvas = document.getElementById(canvasId);
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
    setupCanvas() {
        if (!this.canvas || !this.ctx)
            return;
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
    attachEventListeners() {
        if (!this.canvas)
            return;
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
    handleStart(e) {
        e.preventDefault();
        this.isDrawing = true;
        const coords = this.getCoordinates(e);
        this.lastX = coords.x;
        this.lastY = coords.y;
    }
    handleMove(e) {
        if (!this.isDrawing || !this.ctx)
            return;
        e.preventDefault();
        const coords = this.getCoordinates(e);
        this.ctx.beginPath();
        if (this.eraserMode) {
            this.ctx.globalCompositeOperation = "destination-out";
            this.ctx.lineWidth = this.penSize * NotesCanvas.ERASER_SIZE_MULTIPLIER;
        }
        else {
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
    handleEnd(e) {
        if (this.isDrawing) {
            e.preventDefault();
        }
        this.isDrawing = false;
    }
    getCoordinates(e) {
        if (!this.canvas)
            return { x: 0, y: 0 };
        const rect = this.canvas.getBoundingClientRect();
        let clientX;
        let clientY;
        if (e instanceof MouseEvent) {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        else {
            // TouchEvent
            const touch = e.touches[0] || e.changedTouches[0];
            if (!touch)
                return { x: 0, y: 0 };
            clientX = touch.clientX;
            clientY = touch.clientY;
        }
        // getBoundingClientRect は視覚サイズ（CSS zoom 適用後）を返す。
        // offsetWidth は CSS ピクセルサイズ（zoom 非考慮）を返す。
        // 両者の比率でスケール補正することで、ブラウザ差異・CSS zoom に依存せず正確な描画座標を求める。
        const scaleX = this.canvas.offsetWidth / (rect.width || 1);
        const scaleY = this.canvas.offsetHeight / (rect.height || 1);
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }
    // ─── 設定変更 ──────────────────────────────────────────────────────────────
    setPenSize(size) {
        this.penSize = size;
    }
    setPenColor(color) {
        this.penColor = color;
    }
    setEraserMode(enabled) {
        this.eraserMode = enabled;
    }
    get isEraserMode() {
        return this.eraserMode;
    }
    // ─── キャンバス操作 ────────────────────────────────────────────────────────
    clear() {
        if (!this.canvas || !this.ctx)
            return;
        this.ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
    }
    save() {
        if (!this.canvas)
            return null;
        return {
            dataUrl: this.canvas.toDataURL(),
        };
    }
    restore(state) {
        if (!this.canvas || !this.ctx)
            return;
        const token = ++this.restoreToken;
        const img = new Image();
        img.onload = () => {
            if (!this.ctx || !this.canvas)
                return;
            if (token !== this.restoreToken)
                return; // 古い呼び出しはスキップ
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.drawImage(img, 0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
        };
        img.src = state.dataUrl;
    }
    // ─── クリーンアップ ────────────────────────────────────────────────────────
    destroy() {
        // イベントリスナーの削除は省略（ページ遷移時に自動的に解放される）
        this.canvas = null;
        this.ctx = null;
    }
}
NotesCanvas.ERASER_SIZE_MULTIPLIER = 4;
