/**
 * CategoryRegistry が利用するキャッシュキー生成ヘルパー。
 */

import type { Question } from "../question";
import { CategoryPath } from "../valueObjects";

export interface CategoryRegistryCacheKeys {
  category: string;
  parent?: string;
  top?: string;
  grade?: string;
}

/**
 * Question から subject スコープ付きのキャッシュキー群を生成する。
 * カテゴリ階層の語彙は `CategoryPath` ValueObject に委譲する。
 */
export function buildCacheKeys(question: Question): CategoryRegistryCacheKeys {
  const path = CategoryPath.of({
    subject: question.subject,
    category: question.category,
    parentCategory: question.parentCategory,
    topCategory: question.topCategory,
  });

  return {
    category: path.key(),
    parent: question.parentCategory ? path.keyFor(question.parentCategory) : undefined,
    top: question.topCategory ? path.keyFor(question.topCategory) : undefined,
    grade: question.referenceGrade ? path.keyFor(question.referenceGrade) : undefined,
  };
}

/** Query API 向けの subject::id キーを生成する。 */
export function keyFor(subject: string, id: string): string {
  return `${subject}::${id}`;
}
