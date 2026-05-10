/**
 * CategoryRegistry — 教科 → トップカテゴリ → 親カテゴリ → カテゴリ の階層と、
 * カテゴリごとのメタデータ（解説 URL / 例文 / 説明 / 参考学年）を集約するドメインオブジェクト。
 *
 * `addQuestion()` で 1 件ずつ登録するか、コンストラクタで `Question[]` を一括登録する。
 * いずれの場合も登録は単一パスで完了し、すべてのクエリ（階層・メタデータ・学年）は
 * 構築済みキャッシュへの O(1) 参照で応答する。
 *
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

/** 不変の空 Record を共有して未登録キーへの問い合わせ時のアロケーションを避ける */
const EMPTY_RECORD: Readonly<Record<string, string>> = Object.freeze({});

export class CategoryRegistry {
  // ─── メタデータキャッシュ（subject::category 等をキーとする） ─────────────
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

  // ─── 階層クエリキャッシュ（出現順を保つため Record をインクリメンタルに構築） ──
  /** subject -> { categoryId -> categoryName } */
  private readonly categoriesBySubject = new Map<string, Record<string, string>>();
  /** subject -> { parentId -> parentName } */
  private readonly parentCategoriesBySubject = new Map<string, Record<string, string>>();
  /** subject -> { topId -> topName } */
  private readonly topCategoriesBySubject = new Map<string, Record<string, string>>();
  /** subject::parent -> { categoryId -> categoryName } */
  private readonly categoriesByParent = new Map<string, Record<string, string>>();
  /** subject::top -> { parentId -> parentName } */
  private readonly parentCategoriesByTop = new Map<string, Record<string, string>>();

  // ─── 学年（grade）ビューキャッシュ ────────────────────────────────────────
  /** subject -> 出現順の参考学年一覧 */
  private readonly gradesBySubject = new Map<string, string[]>();
  /** subject::grade -> { categoryId -> categoryName } */
  private readonly categoriesByGrade = new Map<string, Record<string, string>>();
  /** subject -> referenceGrade 未設定カテゴリ { categoryId -> categoryName } */
  private readonly categoriesWithoutGradeBySubject = new Map<string, Record<string, string>>();

  constructor(questions: Iterable<Question> = []) {
    for (const q of questions) {
      this.addQuestion(q);
    }
  }

  /**
   * 1 件の Question を登録し、関連するすべてのキャッシュを更新する。
   * 既存キーに対する重複登録は無視する（最初に登録されたメタデータを保持）。
   */
  addQuestion(q: Question): void {
    const k = key(q.subject, q.category);

    // メタデータ
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

    // 階層: subject -> categories
    const cats = this.getOrCreateRecord(this.categoriesBySubject, q.subject);
    if (!(q.category in cats)) cats[q.category] = q.categoryName;

    // 階層: subject -> parentCategories
    if (q.parentCategory) {
      const parents = this.getOrCreateRecord(this.parentCategoriesBySubject, q.subject);
      if (!(q.parentCategory in parents)) parents[q.parentCategory] = q.parentCategoryName ?? q.parentCategory;

      // 階層: subject::parent -> categories
      const catsByParent = this.getOrCreateRecord(this.categoriesByParent, key(q.subject, q.parentCategory));
      if (!(q.category in catsByParent)) catsByParent[q.category] = q.categoryName;
    }

    // 階層: subject -> topCategories
    if (q.topCategory) {
      const tops = this.getOrCreateRecord(this.topCategoriesBySubject, q.subject);
      if (!(q.topCategory in tops)) tops[q.topCategory] = q.topCategoryName ?? q.topCategory;

      // 階層: subject::top -> parentCategories
      if (q.parentCategory) {
        const parentsByTop = this.getOrCreateRecord(this.parentCategoriesByTop, key(q.subject, q.topCategory));
        if (!(q.parentCategory in parentsByTop)) {
          parentsByTop[q.parentCategory] = q.parentCategoryName ?? q.parentCategory;
        }
      }
    }

    // 学年ビュー
    if (q.referenceGrade) {
      // 出現順を保つため配列で管理し、Object キーで重複検出する
      let grades = this.gradesBySubject.get(q.subject);
      if (!grades) {
        grades = [];
        this.gradesBySubject.set(q.subject, grades);
      }
      if (!grades.includes(q.referenceGrade)) grades.push(q.referenceGrade);

      const catsByGrade = this.getOrCreateRecord(this.categoriesByGrade, key(q.subject, q.referenceGrade));
      if (!(q.category in catsByGrade)) catsByGrade[q.category] = q.categoryName;
    } else {
      const catsWithoutGrade = this.getOrCreateRecord(this.categoriesWithoutGradeBySubject, q.subject);
      if (!(q.category in catsWithoutGrade)) catsWithoutGrade[q.category] = q.categoryName;
    }
  }

  private getOrCreateRecord(map: Map<string, Record<string, string>>, k: string): Record<string, string> {
    let rec = map.get(k);
    if (!rec) {
      rec = {};
      map.set(k, rec);
    }
    return rec;
  }

  // ─── 階層クエリ（O(1)） ──────────────────────────────────────────────────

  /** 指定教科のカテゴリ一覧（ID -> 名前） */
  getCategoriesForSubject(subject: string): Record<string, string> {
    return this.categoriesBySubject.get(subject) ?? EMPTY_RECORD;
  }

  /** 指定教科の親カテゴリ一覧（ID -> 名前） */
  getParentCategoriesForSubject(subject: string): Record<string, string> {
    return this.parentCategoriesBySubject.get(subject) ?? EMPTY_RECORD;
  }

  /** 指定教科・親カテゴリ配下のカテゴリ一覧 */
  getCategoriesForParent(subject: string, parentCategory: string): Record<string, string> {
    return this.categoriesByParent.get(key(subject, parentCategory)) ?? EMPTY_RECORD;
  }

  /** 指定教科のトップカテゴリ一覧 */
  getTopCategoriesForSubject(subject: string): Record<string, string> {
    return this.topCategoriesBySubject.get(subject) ?? EMPTY_RECORD;
  }

  /** 指定教科・トップカテゴリ配下の親カテゴリ一覧 */
  getParentCategoriesForTop(subject: string, topCategory: string): Record<string, string> {
    return this.parentCategoriesByTop.get(key(subject, topCategory)) ?? EMPTY_RECORD;
  }

  // ─── メタデータ（O(1)） ──────────────────────────────────────────────────

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

  // ─── 学年（grade）ビュー（O(1)） ─────────────────────────────────────────

  /** 指定教科のユニークな参考学年リスト（出現順） */
  getUniqueGradesForSubject(subject: string): string[] {
    return this.gradesBySubject.get(subject) ?? [];
  }

  /** 指定教科・学年に属するカテゴリ一覧 */
  getCategoriesForGrade(subject: string, grade: string): Record<string, string> {
    return this.categoriesByGrade.get(key(subject, grade)) ?? EMPTY_RECORD;
  }

  /** 指定教科で参考学年が未設定のカテゴリ一覧 */
  getCategoriesWithoutGrade(subject: string): Record<string, string> {
    return this.categoriesWithoutGradeBySubject.get(subject) ?? EMPTY_RECORD;
  }
}
