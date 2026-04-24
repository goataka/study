/**
 * QuizUseCase — 問題のロード・クイズセッションの開始・進捗の保存を統括する。
 * ポート（インターフェース）に依存し、具体的な実装には依存しない。
 */

import type { Question } from "../domain/question";
import { QuizSession } from "../domain/quizSession";
import type { QuizMode, QuizFilter, AnswerResult } from "../domain/quizSession";
import type { IQuestionRepository, IProgressRepository, QuizRecord } from "./ports";

export type { QuizMode, QuizFilter, AnswerResult, QuizRecord };

export class QuizUseCase {
  private allQuestions: Question[] = [];
  private wrongIds: string[];
  private correctStreaks: Record<string, number>;
  /** subject::category -> guideUrl のキャッシュ（O(1) 参照用） */
  private categoryGuideMap = new Map<string, string>();
  /** subject::category -> example のキャッシュ（O(1) 参照用） */
  private categoryExampleMap = new Map<string, string>();
  /** subject::category -> referenceGrade のキャッシュ（O(1) 参照用） */
  private categoryGradeMap = new Map<string, string>();

  constructor(
    private readonly questionRepo: IQuestionRepository,
    private readonly progressRepo: IProgressRepository
  ) {
    this.wrongIds = this.progressRepo.loadWrongIds();
    this.correctStreaks = this.progressRepo.loadCorrectStreaks();
  }

  async initialize(): Promise<void> {
    this.allQuestions = await this.questionRepo.loadAll();
    // subject::category -> guideUrl / referenceGrade のキャッシュを構築する
    this.categoryGuideMap.clear();
    this.categoryExampleMap.clear();
    this.categoryGradeMap.clear();
    for (const q of this.allQuestions) {
      const key = `${q.subject}::${q.category}`;
      if (q.guideUrl !== undefined && !this.categoryGuideMap.has(key)) {
        this.categoryGuideMap.set(key, q.guideUrl);
      }
      if (q.example !== undefined && !this.categoryExampleMap.has(key)) {
        this.categoryExampleMap.set(key, q.example);
      }
      if (q.referenceGrade !== undefined && !this.categoryGradeMap.has(key)) {
        this.categoryGradeMap.set(key, q.referenceGrade);
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
      const questions = QuizSession.pickRandom(filtered, count);
      return new QuizSession(questions);
    } else if (mode === "practice") {
      const questions = QuizSession.pickInOrder(filtered, count);
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

  submitSession(session: QuizSession): AnswerResult[] {
    const results = session.getResults();

    for (const r of results) {
      if (r.isCorrect) {
        if (this.wrongIds.includes(r.question.id)) {
          // 間違えた問題を正解した場合、連続正解数をカウント
          this.correctStreaks[r.question.id] = (this.correctStreaks[r.question.id] ?? 0) + 1;
          const streak = this.correctStreaks[r.question.id] ?? 0;
          if (streak >= 3) {
            // 3回正解で学習済みとして wrongIds から除く
            this.wrongIds = this.wrongIds.filter((id) => id !== r.question.id);
            delete this.correctStreaks[r.question.id];
          }
        }
      } else {
        if (!this.wrongIds.includes(r.question.id)) {
          this.wrongIds.push(r.question.id);
        }
        // 不正解の場合、連続正解数をリセット
        this.correctStreaks[r.question.id] = 0;
      }
    }

    this.progressRepo.saveWrongIds(this.wrongIds);
    this.progressRepo.saveCorrectStreaks(this.correctStreaks);
    return results;
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
   * 指定した教科・カテゴリの代表例文を返す。
   * 該当カテゴリに example が設定されていない場合は undefined を返す。
   */
  getCategoryExample(subject: string, category: string): string | undefined {
    return this.categoryExampleMap.get(`${subject}::${category}`);
  }

  /**
   * 指定した教科・カテゴリの参考学年を返す。
   * 該当カテゴリに referenceGrade が設定されていない場合は undefined を返す。
   */
  getCategoryReferenceGrade(subject: string, category: string): string | undefined {
    return this.categoryGradeMap.get(`${subject}::${category}`);
  }

  get wrongQuestionIds(): string[] {
    return [...this.wrongIds];
  }
}
