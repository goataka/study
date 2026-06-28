/**
 * QuestionFile から表示用 Question[] への展開ロジック。
 */

import type { Question, QuestionFile } from "./types";

/**
 * QuestionFile を Question[] に展開する（メタ情報を各問題に付加）。
 */
export function expandQuestions(qf: QuestionFile): Question[] {
  const fileQuestionType = qf.questionType ?? "multiple-choice";
  return qf.questions.map((q) => ({
    ...q,
    subject: qf.subject,
    subjectName: qf.subjectName,
    category: qf.category,
    categoryName: qf.categoryName,
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
  }));
}
