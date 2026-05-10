/**
 * adminPanel の純粋ロジック群（DOM 副作用なし）。
 *
 * `presentation/adminPanel.ts` から、ファイル名解析・インポート検証・
 * プレビュー文字列整形などの DOM 非依存なロジックを分離した純粋関数群。
 *
 * これにより React 化や単体テストが容易になる。
 */

/** インポート可能なデータ種類のキー。 */
export type AdminSectionKey = "history" | "mastered" | "streaks";

/** 全セクションキー（settings はインポート対象外）。 */
export const IMPORTABLE_SECTION_KEYS: readonly AdminSectionKey[] = ["history", "mastered", "streaks"];

/**
 * 配列を先頭 `maxItems` 件に切り詰めて、件数サマリ文字列を末尾に追加する。
 * 件数が `maxItems` 以下ならそのまま返す。
 */
export function truncateArray<T>(arr: T[], maxItems = 50): Array<T | string> {
  if (arr.length <= maxItems) return arr.slice();
  return [...arr.slice(0, maxItems), `... (${arr.length - maxItems}件省略、合計${arr.length}件)`];
}

/**
 * ファイル名からインポート対象のセクションキーを推定する。
 *
 * 例: `study-history-2024-01-01.json` → `"history"`
 * `settings` を含む名前は `"settings"` と判定（インポート対象外）。
 * いずれにも一致しなければ `null`。
 */
export function detectFileKeyFromFilename(filename: string): AdminSectionKey | "settings" | null {
  for (const key of IMPORTABLE_SECTION_KEYS) {
    if (filename.includes(key)) return key;
  }
  if (filename.includes("settings")) return "settings";
  return null;
}

/**
 * インポートしようとしているデータの型をチェックし、エラーメッセージ（または null）を返す。
 *
 * - `history` / `mastered`: 配列でなければエラー
 * - `streaks`: オブジェクト（配列でも null でもない）でなければエラー
 *
 * @param sectionTitle 表示用セクション名（エラーメッセージに含める）
 */
export function validateImportPayload(
  fileKey: AdminSectionKey,
  parsedData: unknown,
  sectionTitle: string,
): string | null {
  if (fileKey === "history" || fileKey === "mastered") {
    if (!Array.isArray(parsedData)) {
      return `「${sectionTitle}」データの形式が正しくありません（配列が必要です）。ファイルを確認してください。`;
    }
    return null;
  }
  if (fileKey === "streaks") {
    if (typeof parsedData !== "object" || Array.isArray(parsedData) || parsedData === null) {
      return `「${sectionTitle}」データの形式が正しくありません（オブジェクトが必要です）。ファイルを確認してください。`;
    }
    return null;
  }
  return null;
}

/**
 * JSON プレビュー用の整形文字列を生成する。
 *
 * 整形して 2 スペースインデント、`maxChars` を超えたら末尾を切って `\n...(省略)` を付与する。
 */
export function formatPreviewText(parsedData: unknown, maxChars = 2000): string {
  const formatted = JSON.stringify(parsedData, null, 2);
  if (formatted.length > maxChars) {
    return formatted.slice(0, maxChars) + "\n...(省略)";
  }
  return formatted;
}

/**
 * エクスポート用ファイル名（`study-data-YYYY-MM-DD.json`）を生成する。
 */
export function formatExportFilename(date: Date = new Date()): string {
  const dateStr = date.toISOString().slice(0, 10);
  return `study-data-${dateStr}.json`;
}
