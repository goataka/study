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
  { id: "all", name: "おすすめ", icon: "✨" },
  { id: "progress", name: "進度", icon: "📈" },
  { id: "english", name: "英語", icon: "📚" },
  { id: "math", name: "数学", icon: "🔢" },
  { id: "japanese", name: "国語", icon: "📖" },
  { id: "admin", name: "管理", icon: "⚙️" },
] as const;

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
