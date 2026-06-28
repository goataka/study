/**
 * QuestionFile から表示用 Question[] への展開ロジック。
 */

import type { Question, QuestionFile } from "./types";

const KANJI_CHUNK_SIZE = 10;

function isChunkedKanjiReadingOrWriting(qf: QuestionFile): boolean {
  return (
    qf.subject === "japanese" &&
    qf.category.startsWith("kanji-") &&
    (qf.categoryName.includes("読み") || qf.categoryName.includes("書き"))
  );
}

/**
 * QuestionFile を Question[] に展開する（メタ情報を各問題に付加）。
 */
export function expandQuestions(qf: QuestionFile): Question[] {
  const fileQuestionType = qf.questionType ?? "multiple-choice";
  const shouldChunkKanji = isChunkedKanjiReadingOrWriting(qf);
  return qf.questions.map((q, index) => {
    const chunkIndex = shouldChunkKanji ? Math.floor(index / KANJI_CHUNK_SIZE) : 0;
    const chunkStart = chunkIndex * KANJI_CHUNK_SIZE + 1;
    const chunkEnd = Math.min((chunkIndex + 1) * KANJI_CHUNK_SIZE, qf.questions.length);
    const rangeLabel = `（${chunkStart}-${chunkEnd}字）`;
    return {
      ...q,
      subject: qf.subject,
      subjectName: qf.subjectName,
      category: shouldChunkKanji && chunkIndex > 0 ? `${qf.category}-${chunkIndex + 1}` : qf.category,
      categoryName: shouldChunkKanji ? `${qf.categoryName}${rangeLabel}` : qf.categoryName,
      topCategory: qf.topCategory,
      topCategoryName: qf.topCategoryName,
      parentCategory: qf.parentCategory,
      parentCategoryName: qf.parentCategoryName,
      guideUrl: qf.guideUrl,
      parentCategoryGuideUrl: qf.parentCategoryGuideUrl,
      topCategoryGuideUrl: qf.topCategoryGuideUrl,
      example: qf.example,
      referenceGrade: qf.referenceGrade,
      description: qf.description,
      questionType: q.questionType ?? fileQuestionType,
      caseSensitive: q.caseSensitive ?? qf.caseSensitive,
      prerequisites: qf.prerequisites,
    };
  });
}
