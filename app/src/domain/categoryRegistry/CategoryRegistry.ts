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

import type { Question } from "../question";
import { buildCacheKeys, keyFor } from "./cacheKeys";
import type { CategoryRef } from "./types";

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
  /** subject::category -> 前提単元のカテゴリ ID リスト */
  private readonly categoryPrerequisitesMap = new Map<string, string[]>();

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
    const cacheKeys = buildCacheKeys(q);

    // メタデータ
    if (q.guideUrl !== undefined && !this.categoryGuideMap.has(cacheKeys.category)) {
      this.categoryGuideMap.set(cacheKeys.category, q.guideUrl);
    }
    if (
      q.parentCategoryGuideUrl !== undefined &&
      cacheKeys.parent !== undefined &&
      !this.parentCategoryGuideMap.has(cacheKeys.parent)
    ) {
      this.parentCategoryGuideMap.set(cacheKeys.parent, q.parentCategoryGuideUrl);
    }
    if (
      q.topCategoryGuideUrl !== undefined &&
      cacheKeys.top !== undefined &&
      !this.topCategoryGuideMap.has(cacheKeys.top)
    ) {
      this.topCategoryGuideMap.set(cacheKeys.top, q.topCategoryGuideUrl);
    }
    if (q.example !== undefined && !this.categoryExampleMap.has(cacheKeys.category)) {
      this.categoryExampleMap.set(cacheKeys.category, q.example);
    }
    if (q.referenceGrade !== undefined && !this.categoryGradeMap.has(cacheKeys.category)) {
      this.categoryGradeMap.set(cacheKeys.category, q.referenceGrade);
    }
    if (q.description !== undefined && !this.categoryDescriptionMap.has(cacheKeys.category)) {
      this.categoryDescriptionMap.set(cacheKeys.category, q.description);
    }
    if (q.parentCategory !== undefined && !this.categoryParentMap.has(cacheKeys.category)) {
      this.categoryParentMap.set(cacheKeys.category, {
        id: q.parentCategory,
        name: q.parentCategoryName ?? q.parentCategory,
      });
    }
    if (q.topCategory !== undefined && !this.categoryTopMap.has(cacheKeys.category)) {
      this.categoryTopMap.set(cacheKeys.category, { id: q.topCategory, name: q.topCategoryName ?? q.topCategory });
    }
    if (q.prerequisites !== undefined && !this.categoryPrerequisitesMap.has(cacheKeys.category)) {
      this.categoryPrerequisitesMap.set(cacheKeys.category, q.prerequisites);
    }

    // 階層: subject -> categories
    const cats = this.getOrCreateRecord(this.categoriesBySubject, q.subject);
    if (!(q.category in cats)) cats[q.category] = q.categoryName;

    // 階層: subject -> parentCategories
    if (q.parentCategory) {
      const parents = this.getOrCreateRecord(this.parentCategoriesBySubject, q.subject);
      if (!(q.parentCategory in parents)) parents[q.parentCategory] = q.parentCategoryName ?? q.parentCategory;

      // 階層: subject::parent -> categories
      const catsByParent = this.getOrCreateRecord(this.categoriesByParent, keyFor(q.subject, q.parentCategory));
      if (!(q.category in catsByParent)) catsByParent[q.category] = q.categoryName;
    }

    // 階層: subject -> topCategories
    if (q.topCategory) {
      const tops = this.getOrCreateRecord(this.topCategoriesBySubject, q.subject);
      if (!(q.topCategory in tops)) tops[q.topCategory] = q.topCategoryName ?? q.topCategory;

      // 階層: subject::top -> parentCategories
      if (q.parentCategory) {
        const parentsByTop = this.getOrCreateRecord(this.parentCategoriesByTop, keyFor(q.subject, q.topCategory));
        if (!(q.parentCategory in parentsByTop)) {
          parentsByTop[q.parentCategory] = q.parentCategoryName ?? q.parentCategory;
        }
      }
    }

    // 学年ビュー
    if (q.referenceGrade) {
      let grades = this.gradesBySubject.get(q.subject);
      if (!grades) {
        grades = [];
        this.gradesBySubject.set(q.subject, grades);
      }
      if (!grades.includes(q.referenceGrade)) grades.push(q.referenceGrade);

      const catsByGrade = this.getOrCreateRecord(this.categoriesByGrade, cacheKeys.grade!);
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

  /** 問題が登録されている教科の ID 一覧（登録順） */
  getSubjects(): string[] {
    return [...this.categoriesBySubject.keys()];
  }

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
    return this.categoriesByParent.get(keyFor(subject, parentCategory)) ?? EMPTY_RECORD;
  }

  /** 指定教科のトップカテゴリ一覧 */
  getTopCategoriesForSubject(subject: string): Record<string, string> {
    return this.topCategoriesBySubject.get(subject) ?? EMPTY_RECORD;
  }

  /** 指定教科・トップカテゴリ配下の親カテゴリ一覧 */
  getParentCategoriesForTop(subject: string, topCategory: string): Record<string, string> {
    return this.parentCategoriesByTop.get(keyFor(subject, topCategory)) ?? EMPTY_RECORD;
  }

  getCategoryGuideUrl(subject: string, category: string): string | undefined {
    return this.categoryGuideMap.get(keyFor(subject, category));
  }

  getParentCategoryGuideUrl(subject: string, parentCategory: string): string | undefined {
    return this.parentCategoryGuideMap.get(keyFor(subject, parentCategory));
  }

  getTopCategoryGuideUrl(subject: string, topCategory: string): string | undefined {
    return this.topCategoryGuideMap.get(keyFor(subject, topCategory));
  }

  getParentCategoryForUnit(subject: string, categoryId: string): CategoryRef | undefined {
    return this.categoryParentMap.get(keyFor(subject, categoryId));
  }

  getTopCategoryForUnit(subject: string, categoryId: string): CategoryRef | undefined {
    return this.categoryTopMap.get(keyFor(subject, categoryId));
  }

  getCategoryExample(subject: string, category: string): string | undefined {
    return this.categoryExampleMap.get(keyFor(subject, category));
  }

  getCategoryDescription(subject: string, category: string): string | undefined {
    return this.categoryDescriptionMap.get(keyFor(subject, category));
  }

  getCategoryReferenceGrade(subject: string, category: string): string | undefined {
    return this.categoryGradeMap.get(keyFor(subject, category));
  }

  /** 指定教科・カテゴリの前提単元 ID リストを返す（設定なしの場合は空配列） */
  getCategoryPrerequisites(subject: string, category: string): string[] {
    return this.categoryPrerequisitesMap.get(keyFor(subject, category)) ?? [];
  }

  /** 利用可能な最初の解説 URL（カテゴリ未選択時のフォールバック用） */
  getFirstAvailableGuideUrl(): string | undefined {
    return this.categoryGuideMap.values().next().value;
  }

  /** 指定教科のユニークな参考学年リスト（出現順） */
  getUniqueGradesForSubject(subject: string): string[] {
    return this.gradesBySubject.get(subject) ?? [];
  }

  /** 指定教科・学年に属するカテゴリ一覧 */
  getCategoriesForGrade(subject: string, grade: string): Record<string, string> {
    return this.categoriesByGrade.get(keyFor(subject, grade)) ?? EMPTY_RECORD;
  }

  /** 指定教科で参考学年が未設定のカテゴリ一覧 */
  getCategoriesWithoutGrade(subject: string): Record<string, string> {
    return this.categoriesWithoutGradeBySubject.get(subject) ?? EMPTY_RECORD;
  }
}
