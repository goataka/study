/**
 * QuizUseCase — 問題のロード・クイズセッションの開始・進捗の保存を統括する。
 * ポート（インターフェース）に依存し、具体的な実装には依存しない。
 */

import type { Question } from "../domain/question";
import { QuizSession } from "../domain/quizSession";
import type { QuizMode, QuizFilter, AnswerResult } from "../domain/quizSession";
import type { IQuestionRepository, IProgressRepository, QuizRecord, UserDataExport } from "./ports";

export type { QuizMode, QuizFilter, AnswerResult, QuizRecord, UserDataExport };

/** 全問習得済み時にスローするエラーメッセージ定数 */
export const ERROR_ALL_MASTERED = "ALL_MASTERED";

export class QuizUseCase {
  private allQuestions: Question[] = [];
  private wrongIds: string[];
  private correctStreaks: Record<string, number>;
  private masteredIds: string[];
  /** masteredIds の Set キャッシュ（isMastered() を O(1) にするため） */
  private masteredSet: Set<string>;
  private questionStats: Record<string, { total: number; correct: number }>;
  /** subject::category -> guideUrl のキャッシュ（O(1) 参照用） */
  private categoryGuideMap = new Map<string, string>();
  /** subject::parentCategory -> parentCategoryGuideUrl のキャッシュ（O(1) 参照用） */
  private parentCategoryGuideMap = new Map<string, string>();
  /** subject::topCategory -> topCategoryGuideUrl のキャッシュ（O(1) 参照用） */
  private topCategoryGuideMap = new Map<string, string>();
  /** subject::category -> example のキャッシュ（O(1) 参照用） */
  private categoryExampleMap = new Map<string, string>();
  /** subject::category -> referenceGrade のキャッシュ（O(1) 参照用） */
  private categoryGradeMap = new Map<string, string>();
  /** subject::category -> description のキャッシュ（O(1) 参照用） */
  private categoryDescriptionMap = new Map<string, string>();
  /** subject::category -> { parentId, parentName } のキャッシュ */
  private categoryParentMap = new Map<string, { id: string; name: string }>();
  /** subject::category -> { topId, topName } のキャッシュ */
  private categoryTopMap = new Map<string, { id: string; name: string }>();

  constructor(
    private readonly questionRepo: IQuestionRepository,
    private readonly progressRepo: IProgressRepository
  ) {
    this.wrongIds = this.progressRepo.loadWrongIds();
    this.correctStreaks = this.progressRepo.loadCorrectStreaks();
    this.masteredIds = this.progressRepo.loadMasteredIds();
    this.masteredSet = new Set(this.masteredIds);
    this.questionStats = this.progressRepo.loadQuestionStats();
  }

  async initialize(): Promise<void> {
    this.allQuestions = await this.questionRepo.loadAll();
    // subject::category -> guideUrl / referenceGrade / description のキャッシュを構築する
    this.categoryGuideMap.clear();
    this.parentCategoryGuideMap.clear();
    this.topCategoryGuideMap.clear();
    this.categoryExampleMap.clear();
    this.categoryGradeMap.clear();
    this.categoryDescriptionMap.clear();
    this.categoryParentMap.clear();
    this.categoryTopMap.clear();
    for (const q of this.allQuestions) {
      const key = `${q.subject}::${q.category}`;
      if (q.guideUrl !== undefined && !this.categoryGuideMap.has(key)) {
        this.categoryGuideMap.set(key, q.guideUrl);
      }
      if (q.parentCategoryGuideUrl !== undefined && q.parentCategory !== undefined) {
        const parentKey = `${q.subject}::${q.parentCategory}`;
        if (!this.parentCategoryGuideMap.has(parentKey)) {
          this.parentCategoryGuideMap.set(parentKey, q.parentCategoryGuideUrl);
        }
      }
      if (q.topCategoryGuideUrl !== undefined && q.topCategory !== undefined) {
        const topKey = `${q.subject}::${q.topCategory}`;
        if (!this.topCategoryGuideMap.has(topKey)) {
          this.topCategoryGuideMap.set(topKey, q.topCategoryGuideUrl);
        }
      }
      if (q.example !== undefined && !this.categoryExampleMap.has(key)) {
        this.categoryExampleMap.set(key, q.example);
      }
      if (q.referenceGrade !== undefined && !this.categoryGradeMap.has(key)) {
        this.categoryGradeMap.set(key, q.referenceGrade);
      }
      if (q.description !== undefined && !this.categoryDescriptionMap.has(key)) {
        this.categoryDescriptionMap.set(key, q.description);
      }
      if (q.parentCategory !== undefined && !this.categoryParentMap.has(key)) {
        this.categoryParentMap.set(key, { id: q.parentCategory, name: q.parentCategoryName ?? q.parentCategory });
      }
      if (q.topCategory !== undefined && !this.categoryTopMap.has(key)) {
        this.categoryTopMap.set(key, { id: q.topCategory, name: q.topCategoryName ?? q.topCategory });
      }
    }
  }

  getFilteredQuestions(filter: QuizFilter): Question[] {
    return QuizSession.filter(this.allQuestions, filter);
  }

  getWrongCount(filter: QuizFilter): number {
    const filtered = this.getFilteredQuestions(filter);
    const wrongSet = new Set(this.wrongIds);
    return filtered.filter((q) => wrongSet.has(q.id)).length;
  }

  getCategoriesForSubject(subject: string): Record<string, string> {
    const categories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && !(q.category in categories)) {
        categories[q.category] = q.categoryName;
      }
    }
    return categories;
  }

  getParentCategoriesForSubject(subject: string): Record<string, string> {
    const parentCategories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && q.parentCategory && !(q.parentCategory in parentCategories)) {
        parentCategories[q.parentCategory] = q.parentCategoryName ?? q.parentCategory;
      }
    }
    return parentCategories;
  }

  getCategoriesForParent(subject: string, parentCategory: string): Record<string, string> {
    const categories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && q.parentCategory === parentCategory && !(q.category in categories)) {
        categories[q.category] = q.categoryName;
      }
    }
    return categories;
  }

  getTopCategoriesForSubject(subject: string): Record<string, string> {
    const topCategories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && q.topCategory && !(q.topCategory in topCategories)) {
        topCategories[q.topCategory] = q.topCategoryName ?? q.topCategory;
      }
    }
    return topCategories;
  }

  getParentCategoriesForTop(subject: string, topCategory: string): Record<string, string> {
    const parentCategories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && q.topCategory === topCategory && q.parentCategory && !(q.parentCategory in parentCategories)) {
        parentCategories[q.parentCategory] = q.parentCategoryName ?? q.parentCategory;
      }
    }
    return parentCategories;
  }

  /**
   * 指定した問題の回答統計（総回答数・正解数）を返す。
   * 該当問題の統計がない場合は { total: 0, correct: 0 } を返す。
   */
  getQuestionStat(questionId: string): { total: number; correct: number } {
    return this.questionStats[questionId] ?? { total: 0, correct: 0 };
  }

  /**
   * 一度でもクイズを実施したカテゴリのキー（"subject::category" 形式）を返す。
   * カテゴリの学習状態絵文字の判定に使用する。
   */
  getStudiedCategoryKeys(): Set<string> {
    const history = this.progressRepo.loadHistory();
    const keys = new Set<string>();
    for (const record of history) {
      keys.add(`${record.subject}::${record.category}`);
    }
    return keys;
  }

  startSession(mode: QuizMode, filter: QuizFilter, count = 10): QuizSession {
    const filtered = this.getFilteredQuestions(filter);

    if (mode === "random") {
      const unmastered = filtered.filter((q) => !this.masteredSet.has(q.id));
      if (unmastered.length === 0) {
        throw new Error(ERROR_ALL_MASTERED);
      }
      const questions = QuizSession.pickRandom(unmastered, count);
      return new QuizSession(questions);
    } else if (mode === "practice") {
      const unmastered = filtered.filter((q) => !this.masteredSet.has(q.id));
      if (unmastered.length === 0) {
        throw new Error(ERROR_ALL_MASTERED);
      }
      const questions = QuizSession.pickInOrder(unmastered, count);
      return new QuizSession(questions);
    } else {
      const wrongSet = new Set(this.wrongIds);
      const retryQuestions = filtered.filter((q) => wrongSet.has(q.id));
      if (retryQuestions.length === 0) {
        throw new Error("間違えた問題がありません");
      }
      return new QuizSession(retryQuestions);
    }
  }

  startSessionWithAllQuestions(mode: QuizMode, filter: QuizFilter, count = 10): QuizSession {
    const filtered = this.getFilteredQuestions(filter);
    if (filtered.length === 0) {
      throw new Error("問題がありません");
    }
    if (mode === "practice") {
      const questions = QuizSession.pickInOrder(filtered, count);
      return new QuizSession(questions);
    } else {
      const questions = QuizSession.pickRandom(filtered, count);
      return new QuizSession(questions);
    }
  }

  submitSession(session: QuizSession): AnswerResult[] {
    const results = session.getResults();

    for (const r of results) {
      // 問題ごとの回答統計を更新（全問題対象）
      const stat = this.questionStats[r.question.id] ?? { total: 0, correct: 0 };
      stat.total++;
      if (r.isCorrect) stat.correct++;
      this.questionStats[r.question.id] = stat;

      if (r.isCorrect) {
        // 全問題の連続正解数をカウント
        this.correctStreaks[r.question.id] = (this.correctStreaks[r.question.id] ?? 0) + 1;
        const streak = this.correctStreaks[r.question.id] ?? 0;
        if (streak >= 3) {
          // 3回連続正解で習得済みとして管理
          if (!this.masteredSet.has(r.question.id)) {
            this.masteredIds.push(r.question.id);
            this.masteredSet.add(r.question.id);
          }
          delete this.correctStreaks[r.question.id];
          // wrongIds からも除く
          this.wrongIds = this.wrongIds.filter((id) => id !== r.question.id);
        }
      } else {
        // 習得済みの問題は間違えても wrongIds に追加しない（学習済み状態を維持する）
        if (!this.masteredSet.has(r.question.id) && !this.wrongIds.includes(r.question.id)) {
          this.wrongIds.push(r.question.id);
        }
        // 不正解の場合、連続正解数をリセット（習得済みは維持する）
        if (!this.masteredSet.has(r.question.id)) {
          this.correctStreaks[r.question.id] = 0;
        }
      }
    }

    this.progressRepo.saveWrongIds(this.wrongIds);
    this.progressRepo.saveCorrectStreaks(this.correctStreaks);
    this.progressRepo.saveQuestionStats(this.questionStats);
    this.progressRepo.saveMasteredIds(this.masteredIds);
    return results;
  }

  getMasteredIds(): string[] {
    return [...this.masteredIds];
  }

  isMastered(questionId: string): boolean {
    return this.masteredSet.has(questionId);
  }

  getCorrectStreak(questionId: string): number {
    return this.correctStreaks[questionId] ?? 0;
  }

  /**
   * クイズ結果を履歴に追加して保存する。
   */
  addHistoryRecord(results: AnswerResult[], filter: QuizFilter, mode: QuizMode): void {
    if (results.length === 0) return;

    const firstQuestion = results[0]!.question;
    const subjectName = firstQuestion.subjectName ?? firstQuestion.subject;
    const categoryName = firstQuestion.categoryName ?? firstQuestion.category;

    const correctCount = results.filter((r) => r.isCorrect).length;
    this.appendToHistory({
      id: new Date().toISOString(),
      date: new Date().toISOString(),
      subject: filter.subject,
      subjectName,
      category: filter.category,
      categoryName: filter.category === "all" ? `${subjectName} 全体` : categoryName,
      mode,
      totalCount: results.length,
      correctCount,
      entries: results.map((r) => ({
        questionId: r.question.id,
        questionText: r.question.question,
        isCorrect: r.isCorrect,
        userAnswerIndex: r.userAnswerIndex,
        correctAnswerIndex: r.question.correct,
        choices: [...r.question.choices],
        explanation: r.question.explanation,
        categoryName: r.question.categoryName ?? r.question.category,
        userAnswerText: r.userAnswerText,
      })),
    });
  }

  getHistory(): QuizRecord[] {
    return this.progressRepo.loadHistory();
  }

  exportAllData(): UserDataExport {
    return this.progressRepo.exportAllData();
  }

  /**
   * 進捗データをリポジトリから再ロードしてメモリ上のキャッシュを更新する。
   * 管理タブでのデータ編集後に呼び出す。
   */
  reloadProgressData(): void {
    this.wrongIds = this.progressRepo.loadWrongIds();
    this.correctStreaks = this.progressRepo.loadCorrectStreaks();
    this.masteredIds = this.progressRepo.loadMasteredIds();
    this.masteredSet = new Set(this.masteredIds);
    this.questionStats = this.progressRepo.loadQuestionStats();
  }

  /**
   * 指定したカテゴリを手動で学習済みとしてマークする。
   * 解答なしでも単元を学習済みにできる機能。
   * 対象カテゴリの問題を wrongIds から除き、履歴に manual レコードを追加する。
   * category が "all" の場合は一括操作を防ぐために何もしない。
   */
  markCategoryAsLearned(filter: QuizFilter): void {
    if (filter.category === "all" || filter.subject === "all") return;

    const questions = this.getFilteredQuestions(filter);
    if (questions.length === 0) return;

    const questionIds = new Set(questions.map((q) => q.id));

    // 対象カテゴリの問題を wrongIds から除く
    this.wrongIds = this.wrongIds.filter((id) => !questionIds.has(id));

    // 対象カテゴリの correctStreaks をクリア
    for (const id of questionIds) {
      delete this.correctStreaks[id];
    }

    this.progressRepo.saveWrongIds(this.wrongIds);
    this.progressRepo.saveCorrectStreaks(this.correctStreaks);

    // 対象カテゴリの問題を masteredIds に追加する
    for (const id of questionIds) {
      if (!this.masteredIds.includes(id)) {
        this.masteredIds.push(id);
      }
    }
    this.progressRepo.saveMasteredIds(this.masteredIds);

    // 履歴に手動マークのレコードを追加
    const firstQuestion = questions[0]!;
    const subjectName = firstQuestion.subjectName ?? firstQuestion.subject;
    const categoryName = firstQuestion.categoryName ?? firstQuestion.category;

    this.appendToHistory({
      id: new Date().toISOString(),
      date: new Date().toISOString(),
      subject: filter.subject,
      subjectName,
      category: filter.category,
      categoryName,
      mode: "manual",
      totalCount: questions.length,
      correctCount: questions.length,
      entries: [],
    });
  }

  /**
   * 指定したカテゴリの学習済みマークを解除する。
   * 対象カテゴリの全問題を wrongIds に追加し直し、保存する。
   * category が "all" の場合は一括操作を防ぐために何もしない。
   */
  unmarkCategoryAsLearned(filter: QuizFilter): void {
    if (filter.category === "all" || filter.subject === "all") return;

    const questions = this.getFilteredQuestions(filter);
    if (questions.length === 0) return;

    for (const q of questions) {
      if (!this.wrongIds.includes(q.id)) {
        this.wrongIds.push(q.id);
      }
    }

    this.progressRepo.saveWrongIds(this.wrongIds);

    // 対象カテゴリの問題を masteredIds から除く
    const questionIdSet = new Set(questions.map((q) => q.id));
    this.masteredIds = this.masteredIds.filter((id) => !questionIdSet.has(id));
    this.progressRepo.saveMasteredIds(this.masteredIds);
  }

  /** 履歴レコードを先頭に追加して保存する共通ヘルパー。 */
  private appendToHistory(record: QuizRecord): void {
    const history = this.progressRepo.loadHistory();
    history.unshift(record);
    this.progressRepo.saveHistory(history);
  }

  /**
   * 指定した教科・カテゴリの解説 URL を返す。
   * 該当カテゴリに guideUrl が設定されていない場合は undefined を返す。
   */
  getCategoryGuideUrl(subject: string, category: string): string | undefined {
    return this.categoryGuideMap.get(`${subject}::${category}`);
  }

  /**
   * 指定した教科・親カテゴリの解説 URL を返す。
   * 該当親カテゴリに parentCategoryGuideUrl が設定されていない場合は undefined を返す。
   */
  getParentCategoryGuideUrl(subject: string, parentCategory: string): string | undefined {
    return this.parentCategoryGuideMap.get(`${subject}::${parentCategory}`);
  }

  /**
   * 指定した教科・トップカテゴリの解説 URL を返す。
   * 該当トップカテゴリに topCategoryGuideUrl が設定されていない場合は undefined を返す。
   */
  getTopCategoryGuideUrl(subject: string, topCategory: string): string | undefined {
    return this.topCategoryGuideMap.get(`${subject}::${topCategory}`);
  }

  /**
   * 指定した教科・カテゴリの親カテゴリ情報を返す。
   * 親カテゴリが設定されていない場合は undefined を返す。
   */
  getParentCategoryForUnit(subject: string, categoryId: string): { id: string; name: string } | undefined {
    return this.categoryParentMap.get(`${subject}::${categoryId}`);
  }

  /**
   * 指定した教科・カテゴリのトップカテゴリ情報を返す。
   * トップカテゴリが設定されていない場合は undefined を返す。
   */
  getTopCategoryForUnit(subject: string, categoryId: string): { id: string; name: string } | undefined {
    return this.categoryTopMap.get(`${subject}::${categoryId}`);
  }

  /**
   * 指定した教科・カテゴリの代表例文を返す。
   * 該当カテゴリに example が設定されていない場合は undefined を返す。
   */
  getCategoryExample(subject: string, category: string): string | undefined {
    return this.categoryExampleMap.get(`${subject}::${category}`);
  }

  /**
   * 指定した教科・カテゴリの簡単な説明を返す。
   * 該当カテゴリに description が設定されていない場合は undefined を返す。
   */
  getCategoryDescription(subject: string, category: string): string | undefined {
    return this.categoryDescriptionMap.get(`${subject}::${category}`);
  }

  /**
   * 利用可能な最初の解説 URL を返す。
   * カテゴリが "all"（未選択）の場合のフォールバック用。
   * 解説 URL が 1 件も存在しない場合は undefined を返す。
   */
  getFirstAvailableGuideUrl(): string | undefined {
    return this.categoryGuideMap.values().next().value;
  }

  /**
   * 指定した教科・カテゴリの参考学年を返す。
   * 該当カテゴリに referenceGrade が設定されていない場合は undefined を返す。
   */
  getCategoryReferenceGrade(subject: string, category: string): string | undefined {
    return this.categoryGradeMap.get(`${subject}::${category}`);
  }

  /**
   * 指定した教科の推奨カテゴリを返す。
   * 未学習または学習中（間違いあり）の最初のカテゴリを推奨する。
   * すべて学習済みの場合は最初のカテゴリを返す。
   * カテゴリが存在しない場合は null を返す。
   */
  getRecommendedCategoryForSubject(subject: string): { id: string; name: string; referenceGrade?: string } | null {
    const results = this.getRecommendedCategoriesForSubject(subject, 1);
    return results.length > 0 ? results[0]! : null;
  }

  /**
   * 指定した教科の推奨カテゴリを最大 count 件返す。
   * 未学習または学習中（間違いあり）のカテゴリを優先して返す。
   * すべて学習済みの場合は先頭からカテゴリを返す。
   * カテゴリが存在しない場合は空配列を返す。
   */
  getRecommendedCategoriesForSubject(subject: string, count: number): { id: string; name: string; referenceGrade?: string }[] {
    const studiedKeys = this.getStudiedCategoryKeys();
    const categories = this.getCategoriesForSubject(subject);
    const entries = Object.entries(categories);
    if (entries.length === 0) return [];

    const wrongSet = new Set(this.wrongIds);
    const wrongCountsByCategory = new Map<string, number>();
    for (const question of this.allQuestions) {
      if (question.subject !== subject || !wrongSet.has(question.id)) continue;
      wrongCountsByCategory.set(question.category, (wrongCountsByCategory.get(question.category) ?? 0) + 1);
    }

    const result: { id: string; name: string; referenceGrade?: string }[] = [];
    for (const [catId, catName] of entries) {
      if (result.length >= count) break;
      const key = `${subject}::${catId}`;
      const wrongCount = wrongCountsByCategory.get(catId) ?? 0;
      const isLearned = studiedKeys.has(key) && wrongCount === 0;
      if (!isLearned) {
        result.push({ id: catId, name: catName, referenceGrade: this.categoryGradeMap.get(key) });
      }
    }

    // 未学習カテゴリが足りない場合は学習済みカテゴリで補完する
    if (result.length < count) {
      const addedIds = new Set(result.map((r) => r.id));
      for (const [catId, catName] of entries) {
        if (result.length >= count) break;
        const key = `${subject}::${catId}`;
        const wrongCount = wrongCountsByCategory.get(catId) ?? 0;
        const isLearned = studiedKeys.has(key) && wrongCount === 0;
        if (isLearned && !addedIds.has(catId)) {
          result.push({ id: catId, name: catName, referenceGrade: this.categoryGradeMap.get(key) });
        }
      }
    }

    return result;
  }

  /**
   * 指定した教科・カテゴリの進捗率（0-100 の整数）を返す。
   * 問題数ゼロの場合は 0 を返す。
   * 未学習（学習履歴なし・間違いなし）の場合も 0 を返す。
   */
  getCategoryProgressPct(subject: string, categoryId: string): number {
    let total = 0;
    let wrong = 0;
    const wrongSet = new Set(this.wrongIds);
    for (const q of this.allQuestions) {
      if (q.subject !== subject || q.category !== categoryId) continue;
      total++;
      if (wrongSet.has(q.id)) wrong++;
    }
    if (total === 0) return 0;
    const key = `${subject}::${categoryId}`;
    const studied = this.getStudiedCategoryKeys().has(key);
    // 未学習かつ間違いなしの場合は 0 を返す
    if (!studied && wrong === 0) return 0;
    return Math.round(((total - wrong) / total) * 100);
  }

  /**
   * 指定した教科・カテゴリの学習済み（習得済み）問題数と総問題数を返す。
   */
  getMasteredCountForCategory(subject: string, categoryId: string): { mastered: number; total: number } {
    let total = 0;
    let mastered = 0;
    for (const q of this.allQuestions) {
      if (q.subject !== subject || q.category !== categoryId) continue;
      total++;
      if (this.masteredSet.has(q.id)) mastered++;
    }
    return { mastered, total };
  }

  /**
   * 指定した教科の最終学習日（ISO 8601 文字列）を返す。
   * 学習記録がない場合は null を返す。
   */
  getLastStudyDateForSubject(subject: string): string | null {
    const history = this.progressRepo.loadHistory();
    const record = history.find((r) => r.subject === subject);
    return record ? record.date : null;
  }

  get wrongQuestionIds(): string[] {
    return [...this.wrongIds];
  }

  /**
   * 指定した教科のユニークな参考学年リストを出現順に返す。
   * referenceGrade が設定されていないカテゴリは除外する。
   */
  getUniqueGradesForSubject(subject: string): string[] {
    const seen = new Set<string>();
    const grades: string[] = [];
    for (const q of this.allQuestions) {
      if (q.subject === subject && q.referenceGrade && !seen.has(q.referenceGrade)) {
        seen.add(q.referenceGrade);
        grades.push(q.referenceGrade);
      }
    }
    return grades;
  }

  /**
   * 指定した教科・学年のカテゴリを返す（referenceGrade が完全一致するもの）。
   */
  getCategoriesForGrade(subject: string, grade: string): Record<string, string> {
    const categories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && q.referenceGrade === grade && !(q.category in categories)) {
        categories[q.category] = q.categoryName;
      }
    }
    return categories;
  }

  /**
   * 指定した教科の参考学年が未設定のカテゴリを返す。
   */
  getCategoriesWithoutGrade(subject: string): Record<string, string> {
    const categories: Record<string, string> = {};
    for (const q of this.allQuestions) {
      if (q.subject === subject && !q.referenceGrade && !(q.category in categories)) {
        categories[q.category] = q.categoryName;
      }
    }
    return categories;
  }
}
