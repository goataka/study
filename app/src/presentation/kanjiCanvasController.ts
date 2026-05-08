/**
 * presentation/kanjiCanvasController — 漢字認識キャンバス（KanjiCanvas）の制御。
 *
 * `quizApp.ts` から手書き漢字認識まわりの責務を切り出した薄いコントローラー。
 * - KanjiCanvas グローバル（`./vendor/kanji-canvas.min.js`）への依存を内包する
 * - ref-patterns.js / hiragana-patterns.js の遅延ロードを管理する
 * - ストローク描画 → 認識 → 候補ボタン描画 までを担当する
 *
 * 外部依存:
 * - `getCorrectAnswer`: 現在出題中の問題の正解文字列を返す関数（候補フィルタに使用）
 * - `onSelectCandidate`: 候補がクリックされたときに通知するコールバック（解答入力欄への転記等）
 *
 * クリーンアーキテクチャ上の位置付け: presentation 層内のサブコントローラー。
 * 認識結果から候補をふるい分ける純粋ロジックは `uiHelpers` の文字種判定関数を利用する。
 */

import { isHiraganaOnly, isLatinOnly, loadScript } from "./uiHelpers";

export interface KanjiCanvasControllerOptions {
  /** 現在の問題の正解文字列を返す（候補フィルタ用）。null/undefined ならフィルタ無効。 */
  getCorrectAnswer: () => string | undefined;
  /** 候補ボタンが選択されたときに呼ばれるコールバック。 */
  onSelectCandidate: (char: string) => void;
}

export class KanjiCanvasController {
  private initialized: boolean = false;
  private refPatternsLoadPromise: Promise<void> | null = null;
  private readonly canvasElementId = "kanjiCanvas";
  private readonly candidateListId = "kanjiCandidateList";

  constructor(private readonly options: KanjiCanvasControllerOptions) {}

  // ─── 利用可否判定 ──────────────────────────────────────────────────────────

  /** KanjiCanvas グローバルが利用可能かどうかを返す。 */
  isAvailable(): boolean {
    return typeof (globalThis as unknown as { KanjiCanvas?: unknown }).KanjiCanvas !== "undefined";
  }

  // ─── 折りたたみボタンの表示状態 ───────────────────────────────────────────

  /** 折りたたみボタンの ARIA 属性・表示テキストを更新する。 */
  applyToggleBtnState(btn: HTMLElement, expanded: boolean): void {
    btn.setAttribute("aria-expanded", String(expanded));
    btn.textContent = expanded ? "▲" : "▼";
    const label = expanded ? "入力エリアを折りたたむ" : "入力エリアを展開する";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }

  // ─── パターンデータの遅延ロード ───────────────────────────────────────────

  /**
   * ref-patterns.js（漢字パターンデータ）と hiragana-patterns.js（ひらがなパターンデータ）を
   * 動的に遅延ロードする。重複ロードを防ぐため Promise をキャッシュする。
   * 読み込み失敗時はキャッシュをクリアし、次回呼び出しで再試行できるようにする。
   */
  loadRefPatterns(): Promise<void> {
    if (this.refPatternsLoadPromise) return this.refPatternsLoadPromise;
    this.refPatternsLoadPromise = loadScript("./vendor/ref-patterns.js")
      .then(() => loadScript("./vendor/hiragana-patterns.js"))
      .catch((error) => {
        this.refPatternsLoadPromise = null;
        throw error;
      });
    return this.refPatternsLoadPromise;
  }

  // ─── 初期化 ────────────────────────────────────────────────────────────────

  /**
   * KanjiCanvas を初期化する。初回呼び出し時のみ初期化し、ストローク完了後に候補を自動更新する。
   * KanjiCanvas グローバルが存在しない場合は警告を出して何もしない。
   */
  initialize(): void {
    if (!this.isAvailable()) {
      console.warn("KanjiCanvas が読み込まれていません。手書き入力機能は無効です。");
      return;
    }
    if (this.initialized) return;
    // CSS zoom によるキャンバス座標ズレを防ぐため、canvasの属性サイズを表示サイズに合わせる
    const canvas = document.getElementById(this.canvasElementId) as HTMLCanvasElement | null;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = Math.round(rect.width);
        canvas.height = Math.round(rect.height);
      }
    }
    KanjiCanvas.init(this.canvasElementId);
    // 書き順番号と線の色変化を無効化する（全ストロークをデフォルト色 #333 で統一）
    KanjiCanvas.strokeColors = [];
    if (canvas) {
      canvas.addEventListener("mouseup", () => this.updateCandidates());
      canvas.addEventListener("touchend", () => this.updateCandidates());
    }
    this.initialized = true;
    // ref-patterns.js（漢字）と hiragana-patterns.js（ひらがな）を遅延ロードする。
    // ロード完了前のストロークでは候補が表示されないが、ロード後の次ストロークから表示される。
    void this.loadRefPatterns().catch((e) => {
      console.warn("パターンデータの読み込みに失敗しました:", e);
    });
  }

  // ─── 候補更新 ──────────────────────────────────────────────────────────────

  /**
   * KanjiCanvas で描かれたストロークを認識して候補ボタンを更新する。
   * ひらがな問題（正解がひらがなのみ）の場合はひらがな以外の候補を除外する。
   * 英語問題（正解がラテン文字のみ）の場合はラテン文字以外の候補を除外する。
   * ストロークが描かれていない場合は候補を表示しない。
   */
  updateCandidates(): void {
    const candidateList = document.getElementById(this.candidateListId);
    if (!candidateList || !this.isAvailable()) return;

    const result = KanjiCanvas.recognize(this.canvasElementId);
    // ストロークがない場合（認識結果が空）は候補を表示しない
    if (!result.trim()) {
      candidateList.innerHTML = "";
      return;
    }
    let candidates = result.trim().split(/\s+/).filter(Boolean);

    const correctAnswer = this.options.getCorrectAnswer();
    if (correctAnswer !== undefined && isHiraganaOnly(correctAnswer)) {
      candidates = candidates.filter((char) => isHiraganaOnly(char));
    } else if (correctAnswer !== undefined && isLatinOnly(correctAnswer)) {
      candidates = candidates.filter((char) => isLatinOnly(char));
    }

    candidates = candidates.slice(0, 5);

    candidateList.innerHTML = "";
    candidates.forEach((char) => {
      const btn = document.createElement("button");
      btn.className = "kanji-candidate-btn";
      btn.type = "button";
      btn.textContent = char;
      btn.addEventListener("click", () => {
        this.options.onSelectCandidate(char);
        this.erase();
      });
      candidateList.appendChild(btn);
    });
  }

  // ─── 操作 ──────────────────────────────────────────────────────────────────

  /** 最後の 1 画を取り消す。 */
  deleteLast(): void {
    if (!this.initialized || !this.isAvailable()) return;
    KanjiCanvas.deleteLast(this.canvasElementId);
    this.updateCandidates();
  }

  /** 全ストロークを消去し、候補リストもクリアする。 */
  erase(): void {
    if (this.initialized && this.isAvailable()) {
      KanjiCanvas.erase(this.canvasElementId);
    }
    const candidateList = document.getElementById(this.candidateListId);
    if (candidateList) {
      candidateList.innerHTML = "";
    }
  }
}
