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

import { isHiraganaOnly, isLatinOnly, loadScript, normalizeKanaText } from "../../uiHelpers";

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
   * 英語問題（正解がラテン文字のみ）の場合はラテン文字候補のみを表示する。
   * ラテン文字候補が0件の場合は候補を表示しない。
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
    let candidates = result
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((candidate) => candidate.normalize("NFKC"));
    const kanaNormalizedCandidates = candidates.map((candidate) => normalizeKanaText(candidate));

    const correctAnswer = this.options.getCorrectAnswer();
    const normalizedCorrectAnswer = correctAnswer ? normalizeKanaText(correctAnswer) : undefined;
    if (normalizedCorrectAnswer !== undefined && isHiraganaOnly(normalizedCorrectAnswer)) {
      candidates = expandHiraganaCandidatesWithVoicedVariants(
        kanaNormalizedCandidates.filter((char) => isHiraganaOnly(char)),
      );
    } else if (correctAnswer !== undefined && isLikelyLatinAnswer(correctAnswer)) {
      // 英語問題ではラテン文字候補のみを表示する。
      // ラテン文字候補がない場合は空欄とし、非ラテン文字（漢字・かな等）を混在させない。
      candidates = candidates.filter((char) => isLatinAlphabetCandidate(char));
    }

    candidates = Array.from(new Set(candidates)).slice(0, 5);

    candidateList.innerHTML = "";
    candidates.forEach((char) => {
      const btn = document.createElement("button");
      // 旧 `.kanji-candidate-btn` の見た目を Tailwind ユーティリティで表現する。
      // クラス名 `kanji-candidate-btn` は単体テスト（`kanji.test.ts` 等）の
      // セレクタとして利用されているため**残置**している。
      btn.className =
        "kanji-candidate-btn w-full cursor-pointer rounded-md border-2 border-solid border-[#e1e4e8] bg-white px-3 py-1.5 text-2xl leading-none transition-colors duration-150 hover:border-[#0366d6] hover:bg-[#0366d6] hover:text-white";
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

const HIRAGANA_VOICED_VARIANTS_BY_SEION: Readonly<Record<string, readonly string[]>> = {
  う: ["ゔ"],
  か: ["が"],
  き: ["ぎ"],
  く: ["ぐ"],
  け: ["げ"],
  こ: ["ご"],
  さ: ["ざ"],
  し: ["じ"],
  す: ["ず"],
  せ: ["ぜ"],
  そ: ["ぞ"],
  た: ["だ"],
  ち: ["ぢ"],
  つ: ["づ"],
  て: ["で"],
  と: ["ど"],
  は: ["ば", "ぱ"],
  ひ: ["び", "ぴ"],
  ふ: ["ぶ", "ぷ"],
  へ: ["べ", "ぺ"],
  ほ: ["ぼ", "ぽ"],
} as const;

function expandHiraganaCandidatesWithVoicedVariants(candidates: string[]): string[] {
  const expanded: string[] = [];
  for (const candidate of candidates) {
    expanded.push(candidate);
    const variants = HIRAGANA_VOICED_VARIANTS_BY_SEION[candidate];
    if (variants) expanded.push(...variants);
  }
  return expanded;
}

function isLikelyLatinAnswer(answer: string): boolean {
  const normalized = answer.normalize("NFKC").trim();
  if (!normalized) return false;
  if (isLatinOnly(normalized)) return true;
  const latinOnlyWithoutSeparators = normalized.replace(/[\s.,!?'"`’‘\-_/():;]+/g, "");
  return latinOnlyWithoutSeparators.length > 0 && isLatinOnly(latinOnlyWithoutSeparators);
}

function isLatinAlphabetCandidate(value: string): boolean {
  if (!isLatinOnly(value)) return false;
  return /^[A-Za-z]+$/.test(value);
}
