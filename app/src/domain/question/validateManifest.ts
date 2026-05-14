/**
 * questions/index.json マニフェストの検証ロジック。
 */

import type { QuestionsManifest } from "./types";

/**
 * マニフェストとして期待する基本構造を検証する。
 * 不正な場合は Error をスローします。
 */
export function validateManifest(data: unknown): asserts data is QuestionsManifest {
  if (!data || typeof data !== "object") {
    throw new Error("マニフェストはオブジェクトでなければなりません");
  }
  const manifest = data as Record<string, unknown>;
  if (typeof manifest.version !== "string") {
    throw new Error('マニフェストには "version" 文字列フィールドが必要です');
  }
  if (!manifest.subjects || typeof manifest.subjects !== "object") {
    throw new Error('マニフェストには "subjects" オブジェクトが必要です');
  }
  if (!Array.isArray(manifest.questionFiles)) {
    throw new Error('マニフェストには "questionFiles" 配列が必要です');
  }
}
