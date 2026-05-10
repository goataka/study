/**
 * CategoryRegistry — 教科 → トップカテゴリ → 親カテゴリ → カテゴリ の階層と、
 * カテゴリごとのメタデータ（解説 URL / 例文 / 説明 / 参考学年）を集約するドメインオブジェクト。
 *
 * `Question[]` から構築し、O(1) 参照のための内部キャッシュを保持する。
 * `QuizUseCase` から委譲して使用するため、DOM や fetch には依存しない純粋ロジック。
 */

import type { Question } from "./question";

/** カテゴリ／親カテゴリ／トップカテゴリの ID 名前ペア */
export interface CategoryRef {
  id: string;
  name: string;
}

/** subject::xxx 形式のキーを生成する */
function key(subject: string, id: string): string {
  return `${subject}::${id}`;
}

export class CategoryRegistry {
  /** subject::category -> guideUrl */
  private readonly categoryGuideMap = new Map<string, string>();
  /** subject::parentCategory -> parentCategoryGuideUrl */
  private readonly parentCategoryGuideMap = new Map<string, string>();
  /** subject::topCategory -> topCategoryGuideUrl */
  private readonly topCategoryGuideMap = new Map<string, string>();
  /** subject::category -> example */
  private readonly categoryExampleMap = new Map<string, string>();
  /** subject::category -> referenceGrade */
  private readonly categoryGradeMap = new Map<string, string>();
  /** subject::category -> description */
  private readonly categoryDescriptionMap = new Map<string, string>();
  /** subject::category -> 親カテゴリ参照 */
  private readonly categoryParentMap = new Map<string, CategoryRef>();
  /** subject::category -> トップカテゴリ参照 */
  private readonly categoryTopMap = new Map<string, CategoryRef>();

  constructor(private readonly questions: readonly Question[]) {
    for (const q of questions) {
      const k = key(q.subject, q.category);
      if (q.guideUrl !== undefined && !this.categoryGuideMap.has(k)) {
        this.categoryGuideMap.set(k, q.guideUrl);
      }
      if (q.parentCategoryGuideUrl !== undefined && q.parentCategory !== undefined) {
        const pk = key(q.subject, q.parentCategory);
        if (!this.parentCategoryGuideMap.has(pk)) {
          this.parentCategoryGuideMap.set(pk, q.parentCategoryGuideUrl);
        }
      }
      if (q.topCategoryGuideUrl !== undefined && q.topCategory !== undefined) {
        const tk = key(q.subject, q.topCategory);
        if (!this.topCategoryGuideMap.has(tk)) {
          this.topCategoryGuideMap.set(tk, q.topCategoryGuideUrl);
        }
      }
      if (q.example !== undefined && !this.categoryExampleMap.has(k)) {
        this.categoryExampleMap.set(k, q.example);
      }
      if (q.referenceGrade !== undefined && !this.categoryGradeMap.has(k)) {
        this.categoryGradeMap.set(k, q.referenceGrade);
      }
      if (q.description !== undefined && !this.categoryDescriptionMap.has(k)) {
        this.categoryDescriptionMap.set(k, q.description);
      }
      if (q.parentCategory !== undefined && !this.categoryParentMap.has(k)) {
        this.categoryParentMap.set(k, { id: q.parentCategory, name: q.parentCategoryName ?? q.parentCategory });
      }
      if (q.topCategory !== undefined && !this.categoryTopMap.has(k)) {
        this.categoryTopMap.set(k, { id: q.topCategory, name: q.topCategoryName ?? q.topCategory });
      }
    }
  }

  // ─── 階層クエリ ────────────────────────────────────────────────────────────

  /** 指定教科のカテゴリ一覧（ID -> 名前） */
  getCategoriesForSubject(subject: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const q of this.questions) {
      if (q.subject === subject && !(q.category in out)) {
        out[q.category] = q.categoryName;
      }
    }
    return out;
  }

  /** 指定教科の親カテゴリ一覧（ID -> 名前） */
  getParentCategoriesForSubject(subject: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const q of this.questions) {
      if (q.subject === subject && q.parentCategory && !(q.parentCategory in out)) {
        out[q.parentCategory] = q.parentCategoryName ?? q.parentCategory;
      }
    }
    return out;
  }

  /** 指定教科・親カテゴリ配下のカテゴリ一覧 */
  getCategoriesForParent(subject: string, parentCategory: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const q of this.questions) {
      if (q.subject === subject && q.parentCategory === parentCategory && !(q.category in out)) {
        out[q.category] = q.categoryName;
      }
    }
    return out;
  }

  /** 指定教科のトップカテゴリ一覧 */
  getTopCategoriesForSubject(subject: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const q of this.questions) {
      if (q.subject === subject && q.topCategory && !(q.topCategory in out)) {
        out[q.topCategory] = q.topCategoryName ?? q.topCategory;
      }
    }
    return out;
  }

  /** 指定教科・トップカテゴリ配下の親カテゴリ一覧 */
  getParentCategoriesForTop(subject: string, topCategory: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const q of this.questions) {
      if (q.subject === subject && q.topCategory === topCategory && q.parentCategory && !(q.parentCategory in out)) {
        out[q.parentCategory] = q.parentCategoryName ?? q.parentCategory;
      }
    }
    return out;
  }

  // ─── メタデータ ────────────────────────────────────────────────────────────

  getCategoryGuideUrl(subject: string, category: string): string | undefined {
    return this.categoryGuideMap.get(key(subject, category));
  }

  getParentCategoryGuideUrl(subject: string, parentCategory: string): string | undefined {
    return this.parentCategoryGuideMap.get(key(subject, parentCategory));
  }

  getTopCategoryGuideUrl(subject: string, topCategory: string): string | undefined {
    return this.topCategoryGuideMap.get(key(subject, topCategory));
  }

  getParentCategoryForUnit(subject: string, categoryId: string): CategoryRef | undefined {
    return this.categoryParentMap.get(key(subject, categoryId));
  }

  getTopCategoryForUnit(subject: string, categoryId: string): CategoryRef | undefined {
    return this.categoryTopMap.get(key(subject, categoryId));
  }

  getCategoryExample(subject: string, category: string): string | undefined {
    return this.categoryExampleMap.get(key(subject, category));
  }

  getCategoryDescription(subject: string, category: string): string | undefined {
    return this.categoryDescriptionMap.get(key(subject, category));
  }

  getCategoryReferenceGrade(subject: string, category: string): string | undefined {
    return this.categoryGradeMap.get(key(subject, category));
  }

  /** 利用可能な最初の解説 URL（カテゴリ未選択時のフォールバック用） */
  getFirstAvailableGuideUrl(): string | undefined {
    return this.categoryGuideMap.values().next().value;
  }

  // ─── 学年（grade）ビュー ──────────────────────────────────────────────────

  /** 指定教科のユニークな参考学年リスト（出現順） */
  getUniqueGradesForSubject(subject: string): string[] {
    const seen = new Set<string>();
    const grades: string[] = [];
    for (const q of this.questions) {
      if (q.subject === subject && q.referenceGrade && !seen.has(q.referenceGrade)) {
        seen.add(q.referenceGrade);
        grades.push(q.referenceGrade);
      }
    }
    return grades;
  }

  /** 指定教科・学年に属するカテゴリ一覧 */
  getCategoriesForGrade(subject: string, grade: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const q of this.questions) {
      if (q.subject === subject && q.referenceGrade === grade && !(q.category in out)) {
        out[q.category] = q.categoryName;
      }
    }
    return out;
  }

  /** 指定教科で参考学年が未設定のカテゴリ一覧 */
  getCategoriesWithoutGrade(subject: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const q of this.questions) {
      if (q.subject === subject && !q.referenceGrade && !(q.category in out)) {
        out[q.category] = q.categoryName;
      }
    }
    return out;
  }
}
