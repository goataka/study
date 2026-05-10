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
    throw new Error("Manifest must be an object");
  }
  const manifest = data as Record<string, unknown>;
  if (typeof manifest.version !== "string") {
    throw new Error('Manifest must have a "version" string field');
  }
  if (!manifest.subjects || typeof manifest.subjects !== "object") {
    throw new Error('Manifest must have a "subjects" object');
  }
  if (!Array.isArray(manifest.questionFiles)) {
    throw new Error('Manifest must have a "questionFiles" array');
  }
}
