/**
 * 問題データローダー
 * questions/index.json を読み込み、各カテゴリファイルをフェッチして統合します。
 */

import type { Question, QuestionFile, QuestionsManifest } from "./types";

/** 既知の教科メタ情報（型ガード用） */
export interface SubjectInfo {
  name: string;
}

/**
 * 問題データを全件読み込む。
 * @param baseUrl questions ディレクトリへのベースURL（デフォルト: "questions"）
 */
export async function loadAllQuestions(baseUrl = "questions"): Promise<Question[]> {
  const manifest = await fetchJson<QuestionsManifest>(`${baseUrl}/index.json`);
  validateManifest(manifest);

  const results = await Promise.all(
    manifest.questionFiles.map((file) =>
      fetchJson<QuestionFile>(`${baseUrl}/${file}`).then((qf) => {
        validateQuestionFile(qf);
        return expandQuestions(qf);
      })
    )
  );

  return results.flat();
}

/**
 * 単一の問題ファイルを読み込む（テスト・デバッグ用）。
 */
export async function loadQuestionFile(url: string): Promise<Question[]> {
  const qf = await fetchJson<QuestionFile>(url);
  validateQuestionFile(qf);
  return expandQuestions(qf);
}

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

/**
 * 問題ファイル1件を検証する。
 * 不正な場合は Error をスローします。
 */
export function validateQuestionFile(data: unknown): asserts data is QuestionFile {
  if (!data || typeof data !== "object") {
    throw new Error("QuestionFile must be an object");
  }
  const qf = data as Record<string, unknown>;
  for (const field of ["subject", "subjectName", "category", "categoryName"]) {
    if (typeof qf[field] !== "string") {
      throw new Error(`QuestionFile must have a "${field}" string field`);
    }
  }
  if (!Array.isArray(qf.questions)) {
    throw new Error('QuestionFile must have a "questions" array');
  }
  for (const [i, q] of (qf.questions as unknown[]).entries()) {
    if (!q || typeof q !== "object") {
      throw new Error(`Question at index ${i} must be an object`);
    }
    const qObj = q as Record<string, unknown>;
    for (const field of ["id", "question", "explanation"]) {
      if (typeof qObj[field] !== "string" || (qObj[field] as string).length === 0) {
        throw new Error(`Question[${i}].${field} must be a non-empty string`);
      }
    }
    if (!Array.isArray(qObj.choices) || qObj.choices.length !== 4) {
      throw new Error(`Question[${i}].choices must be an array of exactly 4 elements`);
    }
    for (const [ci, choice] of (qObj.choices as unknown[]).entries()) {
      if (typeof choice !== "string" || choice.trim().length === 0) {
        throw new Error(`Question[${i}].choices[${ci}] must be a non-empty string`);
      }
    }
    if (
      typeof qObj.correct !== "number" ||
      !Number.isInteger(qObj.correct) ||
      qObj.correct < 0 ||
      qObj.correct > 3
    ) {
      throw new Error(`Question[${i}].correct must be an integer between 0 and 3`);
    }
  }
}

// ─── 内部ヘルパー ──────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch "${url}": ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

function expandQuestions(qf: QuestionFile): Question[] {
  return qf.questions.map((q) => ({
    ...q,
    subject: qf.subject,
    subjectName: qf.subjectName,
    category: qf.category,
    categoryName: qf.categoryName,
  }));
}
