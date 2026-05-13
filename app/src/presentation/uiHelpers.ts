/**
 * presentation/uiHelpers — `quizApp.ts` から抽出した純粋ヘルパー関数群。
 *
 * UI コントローラー（`QuizApp`）から DOM 非依存のロジックを切り出し、
 * 単体テストしやすく、再利用しやすくするためのモジュール。
 *
 * クリーンアーキテクチャの方針:
 * - `domain/` の純粋ドメインロジックには昇格しない（あくまで表示計算用）。
 * - ここに置くのは「複数の presentation モジュールから利用される、副作用のない関数」のみ。
 */

/** 教科一覧（タブ表示用） */
export const SUBJECTS = [
  { id: "all", name: "おすすめ", icon: "🎯", tabBg: "#fffde7", tabBgActive: "#fff9c4" },
  { id: "progress", name: "進度", icon: "📈", tabBg: "#e8f0f8", tabBgActive: "#d0e0f0" },
  { id: "english", name: "英語", icon: "🗣️", tabBg: "#e8f0ff", tabBgActive: "#d0e4ff" },
  { id: "math", name: "数学", icon: "🔢", tabBg: "#e8fff0", tabBgActive: "#d0ffe0" },
  { id: "japanese", name: "国語", icon: "📖", tabBg: "#fff0f0", tabBgActive: "#ffe0e0" },
  { id: "admin", name: "管理", icon: "⚙️", tabBg: "#f0f4f8", tabBgActive: "#dce8f4" },
] as const;

/** 教科IDから表示名を取得する。未定義または未登録IDの場合は `undefined` を返す。 */
export function getSubjectNameById(subjectId: string | undefined): string | undefined {
  if (!subjectId) return undefined;
  return SUBJECTS.find((item) => item.id === subjectId)?.name;
}

export interface UnitNameSource {
  subject?: string;
  subjectName?: string;
  topCategoryName?: string;
  parentCategoryName?: string;
  category?: string;
  categoryName?: string;
}

/**
 * 問題の教科・カテゴリ階層情報から表示用の単元名（`A › B › C`）を組み立てる。
 * source が未定義、または有効な要素が1つもない場合は空文字を返す。
 */
export function buildUnitName(source: UnitNameSource | undefined): string {
  if (!source) return "";
  const parts = [
    source.subjectName ?? getSubjectNameById(source.subject),
    source.topCategoryName,
    source.parentCategoryName,
    source.categoryName ?? source.category,
  ].filter((part): part is string => !!part);
  return parts.join(" › ");
}

const KATAKANA_TO_HIRAGANA_OFFSET = 0x60;

/** 参考学年文字列から CSS クラス名を返す（小学→grade-elementary, 中学→grade-middle, 高校→grade-high） */
export function gradeColorClass(referenceGrade: string): string {
  if (referenceGrade.startsWith("小")) return "grade-elementary";
  if (referenceGrade.startsWith("中")) return "grade-middle";
  if (referenceGrade.startsWith("高")) return "grade-high";
  return "";
}

/**
 * 2色進捗バーの幅（%）を計算する。
 * Math.round の丸め誤差で masteredPct + inProgressPct が 100% を超えないようにクランプする。
 */
export function calcDualProgressPct(
  mastered: number,
  wrong: number,
  total: number,
): { masteredPct: number; inProgressPct: number } {
  if (total === 0) return { masteredPct: 0, inProgressPct: 0 };
  const masteredPct = Math.round((mastered / total) * 100);
  const inProgressPct = Math.min(Math.round((wrong / total) * 100), 100 - masteredPct);
  return { masteredPct, inProgressPct };
}

// ─── 日付ユーティリティ ─────────────────────────────────────────────────────

/** Date オブジェクトを YYYY-MM-DD 形式の文字列に変換して返す。 */
export function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 今日の日付を YYYY-MM-DD 形式で返す。 */
export function currentDateString(): string {
  return formatDate(new Date());
}

/** YYYY-MM-DD 形式の文字列を Date オブジェクトに変換して返す（ローカルタイムの 0:00）。 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString + "T00:00:00");
}

// ─── 文字列ユーティリティ ───────────────────────────────────────────────────

/**
 * 共有 URL を検証し、http/https スキームの場合のみそのまま返す。
 * それ以外（javascript: 等）は空文字を返す。
 */
export function sanitizeShareUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? trimmed : "";
  } catch {
    return "";
  }
}

/** 文字列がひらがなのみで構成されているかどうかを判定する。 */
export function isHiraganaOnly(str: string): boolean {
  return /^[\u3041-\u309F]+$/.test(str);
}

/** カタカナをひらがなへ寄せた正規化文字列を返す。 */
export function normalizeKanaText(str: string): string {
  return str
    .normalize("NFKC")
    .replace(/[\u30A1-\u30F6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - KATAKANA_TO_HIRAGANA_OFFSET));
}

/** 文字列がラテン文字（ASCII 0x20–0x7E の印字可能文字）のみで構成されているかどうかを判定する。 */
export function isLatinOnly(str: string): boolean {
  return /^[\x20-\x7E]+$/.test(str);
}

/** 問題や単元の学習状況。 */
export type LearningProgressStatus = "unlearned" | "studying" | "learned";

/** 習得数・学習中数から学習状況を返す。 */
export function getLearningProgressStatus(progress: {
  mastered: number;
  total: number;
  inProgress: number;
}): LearningProgressStatus {
  const isLearned = progress.total > 0 && progress.mastered === progress.total;
  if (isLearned) return "learned";
  return progress.inProgress > 0 || progress.mastered > 0 ? "studying" : "unlearned";
}

// ─── DOM ユーティリティ ─────────────────────────────────────────────────────

/** 指定 ID の要素にテキストを設定する（要素が無ければ何もしない）。 */
export function setText(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/**
 * バッククォート区切りテキストを部品列に分解する純粋関数。
 * 例: "I `play` games." → [{type:"text",text:"I "},{type:"code",text:"play"},{type:"text",text:" games."}]
 * 空の text 部分は除外する（隣接コードの場合や前後余白なしの場合）。
 */
export type BacktickPart = { type: "text"; text: string } | { type: "code"; text: string };
export function parseBacktickText(text: string): BacktickPart[] {
  const segments = text.split(/`([^`]+)`/);
  const parts: BacktickPart[] = [];
  segments.forEach((seg, i) => {
    if (i % 2 === 1) {
      parts.push({ type: "code", text: seg });
    } else if (seg) {
      parts.push({ type: "text", text: seg });
    }
  });
  return parts;
}

/**
 * バッククォートで囲まれたテキストを <code> タグに変換して要素に追加する。
 * 例: "I `play` games." → "I " + <code>play</code> + " games."
 */
export function renderBacktickText(container: HTMLElement, text: string): void {
  const parts = parseBacktickText(text);
  for (const part of parts) {
    if (part.type === "code") {
      const code = document.createElement("code");
      code.className = "category-example-highlight";
      code.textContent = part.text;
      container.appendChild(code);
    } else {
      container.appendChild(document.createTextNode(part.text));
    }
  }
}

/**
 * navigator.clipboard が使えない環境用のフォールバックコピー。
 * document.execCommand('copy') は非推奨だが、navigator.clipboard 非対応環境用の代替として使用する。
 */
export function fallbackCopy(text: string): void {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

// ─── スクリプト動的ロード ───────────────────────────────────────────────────

/** スクリプトファイルを動的にロードする汎用ヘルパー。 */
export function loadScript(src: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(new Error(`${src} の読み込みに失敗しました: ${e instanceof Event ? e.type : e}`));
    document.body.appendChild(script);
  });
}
