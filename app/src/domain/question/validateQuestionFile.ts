/**
 * 問題ファイル（QuestionFile）の検証ロジック。
 */

import type { QuestionFile, QuestionType } from "./types";
import { validateGuideUrl } from "./validateGuideUrl";

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
  // topCategory と topCategoryName はオプション（両方あるか両方ないか）
  if (qf.topCategory !== undefined || qf.topCategoryName !== undefined) {
    if (typeof qf.topCategory !== "string" || typeof qf.topCategoryName !== "string") {
      throw new Error("If topCategory or topCategoryName is present, both must be strings");
    }
  }
  // parentCategory と parentCategoryName はオプション（両方あるか両方ないか）
  if (qf.parentCategory !== undefined || qf.parentCategoryName !== undefined) {
    if (typeof qf.parentCategory !== "string" || typeof qf.parentCategoryName !== "string") {
      throw new Error("If parentCategory or parentCategoryName is present, both must be strings");
    }
  }
  // guideUrl はオプションの文字列フィールド
  if (qf.guideUrl !== undefined) {
    if (typeof qf.guideUrl !== "string") {
      throw new Error('"guideUrl" must be a string if present');
    }
    validateGuideUrl(qf.guideUrl, "guideUrl");
  }
  // parentCategoryGuideUrl はオプションの文字列フィールド（guideUrl と同じ検証ルールを適用）
  if (qf.parentCategoryGuideUrl !== undefined) {
    if (typeof qf.parentCategoryGuideUrl !== "string") {
      throw new Error('"parentCategoryGuideUrl" must be a string if present');
    }
    if (!qf.parentCategory) {
      throw new Error('"parentCategoryGuideUrl" requires "parentCategory" to be set');
    }
    validateGuideUrl(qf.parentCategoryGuideUrl, "parentCategoryGuideUrl");
  }
  // topCategoryGuideUrl はオプションの文字列フィールド（guideUrl と同じ検証ルールを適用）
  if (qf.topCategoryGuideUrl !== undefined) {
    if (typeof qf.topCategoryGuideUrl !== "string") {
      throw new Error('"topCategoryGuideUrl" must be a string if present');
    }
    if (!qf.topCategory) {
      throw new Error('"topCategoryGuideUrl" requires "topCategory" to be set');
    }
    validateGuideUrl(qf.topCategoryGuideUrl, "topCategoryGuideUrl");
  }
  // example はオプションの文字列フィールド（空文字は不可）
  if (qf.example !== undefined) {
    if (typeof qf.example !== "string") {
      throw new Error('"example" must be a string if present');
    }
    if (qf.example.trim().length === 0) {
      throw new Error('"example" must not be an empty string');
    }
  }
  // description はオプションの文字列フィールド（空文字は不可）
  if (qf.description !== undefined) {
    if (typeof qf.description !== "string") {
      throw new Error('"description" must be a string if present');
    }
    if (qf.description.trim().length === 0) {
      throw new Error('"description" must not be an empty string');
    }
  }
  // referenceGrade はオプションの文字列フィールド
  if (qf.referenceGrade !== undefined && typeof qf.referenceGrade !== "string") {
    throw new Error('"referenceGrade" must be a string if present');
  }
  // questionType（ファイルレベル）はオプション
  if (qf.questionType !== undefined && qf.questionType !== "multiple-choice" && qf.questionType !== "text-input") {
    throw new Error('"questionType" must be "multiple-choice" or "text-input"');
  }
  const fileQuestionType = (qf.questionType as QuestionType | undefined) ?? "multiple-choice";
  // caseSensitive はオプションのブール値
  if (qf.caseSensitive !== undefined && typeof qf.caseSensitive !== "boolean") {
    throw new Error('"caseSensitive" must be a boolean if present');
  }

  if (!Array.isArray(qf.questions)) {
    throw new Error('QuestionFile must have a "questions" array');
  }
  for (const [i, q] of (qf.questions as unknown[]).entries()) {
    validateRawQuestion(q, i, fileQuestionType);
  }
}

/** 個別問題の検証（QuestionFile 内の `questions[i]` を検証する） */
function validateRawQuestion(q: unknown, i: number, fileQuestionType: QuestionType): void {
  if (!q || typeof q !== "object") {
    throw new Error(`Question at index ${i} must be an object`);
  }
  const qObj = q as Record<string, unknown>;
  for (const field of ["id", "question", "explanation"]) {
    if (typeof qObj[field] !== "string" || (qObj[field] as string).length === 0) {
      throw new Error(`Question[${i}].${field} must be a non-empty string`);
    }
  }
  // questionType（問題レベル）はオプション（ファイルレベルを継承）
  if (
    qObj.questionType !== undefined &&
    qObj.questionType !== "multiple-choice" &&
    qObj.questionType !== "text-input"
  ) {
    throw new Error(`Question[${i}].questionType must be "multiple-choice" or "text-input"`);
  }
  const qType: QuestionType = (qObj.questionType as QuestionType | undefined) ?? fileQuestionType;

  // caseSensitive（問題レベル）はオプション。存在する場合は boolean 必須
  // （未検証だと "true" 等の文字列が truthy として採点ロジックへ伝播してしまう）
  if (qObj.caseSensitive !== undefined && typeof qObj.caseSensitive !== "boolean") {
    throw new Error(`Question[${i}].caseSensitive must be a boolean if present`);
  }

  if (!Array.isArray(qObj.choices) || qObj.choices.length === 0) {
    throw new Error(`Question[${i}].choices must be a non-empty array`);
  }
  for (const [ci, choice] of (qObj.choices as unknown[]).entries()) {
    if (typeof choice !== "string" || choice.trim().length === 0) {
      throw new Error(`Question[${i}].choices[${ci}] must be a non-empty string`);
    }
  }

  if (qType === "multiple-choice") {
    if ((qObj.choices as unknown[]).length !== 4) {
      throw new Error(`Question[${i}].choices must be an array of exactly 4 elements`);
    }
    if (typeof qObj.correct !== "number" || !Number.isInteger(qObj.correct) || qObj.correct < 0 || qObj.correct > 3) {
      throw new Error(`Question[${i}].correct must be an integer between 0 and 3`);
    }
  } else {
    // text-input: correct は choices の有効なインデックス
    if (
      typeof qObj.correct !== "number" ||
      !Number.isInteger(qObj.correct) ||
      qObj.correct < 0 ||
      qObj.correct >= (qObj.choices as unknown[]).length
    ) {
      throw new Error(`Question[${i}].correct must be a valid index into choices`);
    }
  }
}
