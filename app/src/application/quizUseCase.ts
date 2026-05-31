/**
 * QuizUseCase — 問題のロード・クイズセッションの開始・進捗の保存を統括する。
 * ポート（インターフェース）に依存し、具体的な実装には依存しない。
 *
 * カテゴリ階層・カテゴリメタデータのクエリは `CategoryRegistry`（ドメイン層）に委譲する。
 */

import type { Question } from "../domain/question";
import { QuizSession } from "../domain/quizSession";
import type { QuizMode, QuizFilter, AnswerResult } from "../domain/quizSession";
import { CategoryRegistry } from "../domain/categoryRegistry";
import type {
  IQuestionRepository,
  IProgressRepository,
  QuizRecord,
  UserDataExport,
  CategoryStageRecord,
  CategoryStage,
} from "./ports";

export type { QuizMode, QuizFilter, AnswerResult, QuizRecord, UserDataExport };
export type { CategoryStageRecord, CategoryStage };
export type { Question } from "../domain/question";
export { shuffleChoices } from "../domain/question";
export type { QuizSession } from "../domain/quizSession";

/** 全問習得済み時にスローするエラーメッセージ定数 */
export const ERROR_ALL_MASTERED = "ALL_MASTERED";
/** 未回答時の表示テキスト */
export const NO_ANSWER_TEXT = "未回答";

export class QuizUseCase {
  private allQuestions: Question[] = [];
  private wrongIds: string[];
  /** wrongIds の Set キャッシュ（含有判定・除去を O(1) にするため） */
  private wrongSet: Set<string>;
  private correctStreaks: Record<string, number>;
  private masteredIds: string[];
  /** masteredIds の Set キャッシュ（isMastered() を O(1) にするため） */
  private masteredSet: Set<string>;
  private questionStats: Record<string, { total: number; correct: number }>;
  /** カテゴリ階層・メタデータのドメインオブジェクト（initialize() で構築） */
  private categoryRegistry: CategoryRegistry = new CategoryRegistry([]);
  /** questionId -> Question のキャッシュ（O(1) 参照用） */
  private questionsById = new Map<string, Question>();
  /** "subject::categoryId" -> その単元の問題一覧（initialize() で構築、静的） */
  private questionsByCategory = new Map<string, Question[]>();
  /** 単元ごとの学習ステージ (キー: "subject::categoryId") */
  private categoryStages: Record<string, CategoryStageRecord>;

  constructor(
    private readonly questionRepo: IQuestionRepository,
    private readonly progressRepo: IProgressRepository,
  ) {
    this.wrongIds = this.progressRepo.loadWrongIds();
    this.wrongSet = new Set(this.wrongIds);
    this.correctStreaks = this.progressRepo.loadCorrectStreaks();
    this.masteredIds = this.progressRepo.loadMasteredIds();
    this.masteredSet = new Set(this.masteredIds);
    this.questionStats = this.progressRepo.loadQuestionStats();
    this.categoryStages = this.progressRepo.loadCategoryStages();
  }

  async initialize(): Promise<void> {
    this.allQuestions = await this.questionRepo.loadAll();
    // 単一パスで CategoryRegistry の集計と questionsById / questionsByCategory の索引を構築する
    this.categoryRegistry = new CategoryRegistry();
    this.questionsById.clear();
    this.questionsByCategory.clear();
    for (const q of this.allQuestions) {
      this.questionsById.set(q.id, q);
      this.categoryRegistry.addQuestion(q);
      const key = `${q.subject}::${q.category}`;
      const group = this.questionsByCategory.get(key);
      if (group) {
        group.push(q);
      } else {
        this.questionsByCategory.set(key, [q]);
      }
    }
  }

  getFilteredQuestions(filter: QuizFilter): Question[] {
    return QuizSession.filter(this.allQuestions, filter);
  }

  getWrongCount(filter: QuizFilter): number {
    const filtered = this.getFilteredQuestions(filter);
    return filtered.filter((q) => this.wrongSet.has(q.id)).length;
  }

  /**
   * 指定したフィルターに一致する問題のうち、1回以上回答済みで未習得の問題数を返す。
   * 進捗バーの「学習中」カウントに使用する。
   */
  getInProgressCount(filter: QuizFilter): number {
    const filtered = this.getFilteredQuestions(filter);
    return filtered.filter((q) => (this.questionStats[q.id]?.total ?? 0) > 0 && !this.masteredSet.has(q.id)).length;
  }

  getCategoriesForSubject(subject: string): Record<string, string> {
    return this.categoryRegistry.getCategoriesForSubject(subject);
  }

  getParentCategoriesForSubject(subject: string): Record<string, string> {
    return this.categoryRegistry.getParentCategoriesForSubject(subject);
  }

  getCategoriesForParent(subject: string, parentCategory: string): Record<string, string> {
    return this.categoryRegistry.getCategoriesForParent(subject, parentCategory);
  }

  getTopCategoriesForSubject(subject: string): Record<string, string> {
    return this.categoryRegistry.getTopCategoriesForSubject(subject);
  }

  getParentCategoriesForTop(subject: string, topCategory: string): Record<string, string> {
    return this.categoryRegistry.getParentCategoriesForTop(subject, topCategory);
  }

  /**
   * 指定した問題の回答統計（総回答数・正解数）を返す。
   * 該当問題の統計がない場合は { total: 0, correct: 0 } を返す。
   */
  getQuestionStat(questionId: string): { total: number; correct: number } {
    return this.questionStats[questionId] ?? { total: 0, correct: 0 };
  }

  /**
   * 全問題の回答統計を一括で返す（浅いコピー）。
   * ループ内での個別呼び出しを避け、パフォーマンスを改善するために使用する。
   * 呼び出し側のミューテートがユースケース内部状態に影響しないよう浅いコピーを返す。
   */
  getAllQuestionStats(): Record<string, { total: number; correct: number }> {
    return { ...this.questionStats };
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
      const retryQuestions = filtered.filter((q) => this.wrongSet.has(q.id));
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
    this.submitAnswerResults(results);
    return results;
  }

  /** 回答結果を進捗データに反映して保存する。 */
  submitAnswerResults(results: AnswerResult[]): void {
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
        const { stage } = this.getCategoryStage(r.question.subject, r.question.category);
        // 復習ステージ（stage>0）は1回正解で学習済みに戻す。
        const requiredStreak = stage > 0 ? 1 : 3;
        if (streak >= requiredStreak) {
          // 必要回数の連続正解で習得済みとして管理
          if (!this.masteredSet.has(r.question.id)) {
            this.masteredIds.push(r.question.id);
            this.masteredSet.add(r.question.id);
          }
          delete this.correctStreaks[r.question.id];
          // wrongIds からも除く
          this.removeWrongId(r.question.id);
        }
      } else {
        // 習得済みの問題は間違えても wrongIds に追加しない（学習済み状態を維持する）
        if (!this.masteredSet.has(r.question.id)) {
          this.addWrongId(r.question.id);
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
        isCorrect: r.isCorrect,
        userAnswerIndex: r.userAnswerIndex,
        userAnswerText: r.userAnswerText,
        userAnswerChoiceText:
          r.userAnswerIndex >= 0 && r.userAnswerIndex < (r.question.choices?.length ?? 0)
            ? r.question.choices?.[r.userAnswerIndex]
            : NO_ANSWER_TEXT,
        correctAnswerText: r.question.choices?.[r.question.correct] ?? "",
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
    this.wrongSet = new Set(this.wrongIds);
    this.correctStreaks = this.progressRepo.loadCorrectStreaks();
    this.masteredIds = this.progressRepo.loadMasteredIds();
    this.masteredSet = new Set(this.masteredIds);
    this.questionStats = this.progressRepo.loadQuestionStats();
    this.categoryStages = this.progressRepo.loadCategoryStages();
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
    this.removeWrongIds(questionIds);

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
      this.masteredSet.add(id);
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
      this.addWrongId(q.id);
    }

    this.progressRepo.saveWrongIds(this.wrongIds);

    // 対象カテゴリの問題を masteredIds から除く
    const questionIdSet = new Set(questions.map((q) => q.id));
    this.masteredIds = this.masteredIds.filter((id) => !questionIdSet.has(id));
    for (const id of questionIdSet) {
      this.masteredSet.delete(id);
    }
    this.progressRepo.saveMasteredIds(this.masteredIds);
  }

  /** 履歴レコードを先頭に追加して保存する共通ヘルパー。 */
  private appendToHistory(record: QuizRecord): void {
    const history = this.progressRepo.loadHistory();
    history.unshift(record);
    this.progressRepo.saveHistory(history);
  }

  /** wrongIds に問題IDを追加する（配列と Set キャッシュを同期、重複は無視）。 */
  private addWrongId(id: string): void {
    if (this.wrongSet.has(id)) return;
    this.wrongIds.push(id);
    this.wrongSet.add(id);
  }

  /** wrongIds から問題IDを除去する（配列と Set キャッシュを同期）。 */
  private removeWrongId(id: string): void {
    if (!this.wrongSet.delete(id)) return;
    this.wrongIds = this.wrongIds.filter((wid) => wid !== id);
  }

  /** wrongIds から複数の問題IDをまとめて除去する（配列と Set キャッシュを同期）。 */
  private removeWrongIds(ids: Set<string>): void {
    this.wrongIds = this.wrongIds.filter((wid) => !ids.has(wid));
    for (const id of ids) this.wrongSet.delete(id);
  }

  /**
   * 指定した教科・カテゴリの解説 URL を返す。
   * 該当カテゴリに guideUrl が設定されていない場合は undefined を返す。
   */
  getCategoryGuideUrl(subject: string, category: string): string | undefined {
    return this.categoryRegistry.getCategoryGuideUrl(subject, category);
  }

  /**
   * 指定した教科・親カテゴリの解説 URL を返す。
   * 該当親カテゴリに parentCategoryGuideUrl が設定されていない場合は undefined を返す。
   */
  getParentCategoryGuideUrl(subject: string, parentCategory: string): string | undefined {
    return this.categoryRegistry.getParentCategoryGuideUrl(subject, parentCategory);
  }

  /**
   * 指定した教科・トップカテゴリの解説 URL を返す。
   * 該当トップカテゴリに topCategoryGuideUrl が設定されていない場合は undefined を返す。
   */
  getTopCategoryGuideUrl(subject: string, topCategory: string): string | undefined {
    return this.categoryRegistry.getTopCategoryGuideUrl(subject, topCategory);
  }

  /**
   * 指定した教科・カテゴリの親カテゴリ情報を返す。
   * 親カテゴリが設定されていない場合は undefined を返す。
   */
  getParentCategoryForUnit(subject: string, categoryId: string): { id: string; name: string } | undefined {
    return this.categoryRegistry.getParentCategoryForUnit(subject, categoryId);
  }

  /**
   * 指定した教科・カテゴリのトップカテゴリ情報を返す。
   * トップカテゴリが設定されていない場合は undefined を返す。
   */
  getTopCategoryForUnit(subject: string, categoryId: string): { id: string; name: string } | undefined {
    return this.categoryRegistry.getTopCategoryForUnit(subject, categoryId);
  }

  /**
   * 指定した教科・カテゴリの代表例文を返す。
   * 該当カテゴリに example が設定されていない場合は undefined を返す。
   */
  getCategoryExample(subject: string, category: string): string | undefined {
    return this.categoryRegistry.getCategoryExample(subject, category);
  }

  /**
   * 指定した教科・カテゴリの簡単な説明を返す。
   * 該当カテゴリに description が設定されていない場合は undefined を返す。
   */
  getCategoryDescription(subject: string, category: string): string | undefined {
    return this.categoryRegistry.getCategoryDescription(subject, category);
  }

  /**
   * 利用可能な最初の解説 URL を返す。
   * カテゴリが "all"（未選択）の場合のフォールバック用。
   * 解説 URL が 1 件も存在しない場合は undefined を返す。
   */
  getFirstAvailableGuideUrl(): string | undefined {
    return this.categoryRegistry.getFirstAvailableGuideUrl();
  }

  /**
   * 指定した教科・カテゴリの参考学年を返す。
   * 該当カテゴリに referenceGrade が設定されていない場合は undefined を返す。
   */
  getCategoryReferenceGrade(subject: string, category: string): string | undefined {
    return this.categoryRegistry.getCategoryReferenceGrade(subject, category);
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
  getRecommendedCategoriesForSubject(
    subject: string,
    count: number,
  ): { id: string; name: string; referenceGrade?: string; isLearned: boolean }[] {
    const studiedKeys = this.getStudiedCategoryKeys();
    const categories = this.getCategoriesForSubject(subject);
    const entries = Object.entries(categories);
    if (entries.length === 0) return [];

    const wrongCountsByCategory = new Map<string, number>();
    for (const question of this.allQuestions) {
      if (question.subject !== subject || !this.wrongSet.has(question.id)) continue;
      wrongCountsByCategory.set(question.category, (wrongCountsByCategory.get(question.category) ?? 0) + 1);
    }

    const result: { id: string; name: string; referenceGrade?: string; isLearned: boolean }[] = [];
    for (const [catId, catName] of entries) {
      if (result.length >= count) break;
      const key = `${subject}::${catId}`;
      const wrongCount = wrongCountsByCategory.get(catId) ?? 0;
      const isLearned = studiedKeys.has(key) && wrongCount === 0;
      if (!isLearned && this._arePrerequisitesMet(subject, catId)) {
        result.push({
          id: catId,
          name: catName,
          referenceGrade: this.categoryRegistry.getCategoryReferenceGrade(subject, catId),
          isLearned: false,
        });
      }
    }

    // 未学習カテゴリが足りない場合は学習済みカテゴリで補完する（前提単元チェックも適用）
    if (result.length < count) {
      const addedIds = new Set(result.map((r) => r.id));
      for (const [catId, catName] of entries) {
        if (result.length >= count) break;
        const key = `${subject}::${catId}`;
        const wrongCount = wrongCountsByCategory.get(catId) ?? 0;
        const isLearned = studiedKeys.has(key) && wrongCount === 0;
        if (isLearned && !addedIds.has(catId) && this._arePrerequisitesMet(subject, catId)) {
          result.push({
            id: catId,
            name: catName,
            referenceGrade: this.categoryRegistry.getCategoryReferenceGrade(subject, catId),
            isLearned: true,
          });
        }
      }
    }

    return result;
  }

  /**
   * 指定した教科・カテゴリの進捗率（0-100 の整数）を返す。
   * 問題数ゼロの場合は 0 を返す。
   * 未学習（学習履歴なし・間違いなし・習得済みなし）の場合も 0 を返す。
   * 進捗率は mastered / total で算出する（カテゴリ一覧の進捗バーと統一）。
   */
  getCategoryProgressPct(subject: string, categoryId: string): number {
    const questions = this.questionsByCategory.get(`${subject}::${categoryId}`) ?? [];
    const total = questions.length;
    if (total === 0) return 0;
    let mastered = 0;
    let wrong = 0;
    for (const q of questions) {
      if (this.masteredSet.has(q.id)) mastered++;
      if (this.wrongSet.has(q.id)) wrong++;
    }
    const key = `${subject}::${categoryId}`;
    const studied = this.getStudiedCategoryKeys().has(key);
    // 未学習かつ習得済みなし・間違いなしの場合は 0 を返す
    if (!studied && mastered === 0 && wrong === 0) return 0;
    return Math.round((mastered / total) * 100);
  }

  /**
   * 指定した教科・カテゴリの学習済み（習得済み）問題数と総問題数を返す。
   */
  getMasteredCountForCategory(subject: string, categoryId: string): { mastered: number; total: number } {
    const questions = this.questionsByCategory.get(`${subject}::${categoryId}`) ?? [];
    let mastered = 0;
    for (const q of questions) {
      if (this.masteredSet.has(q.id)) mastered++;
    }
    return { mastered, total: questions.length };
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
    return this.categoryRegistry.getUniqueGradesForSubject(subject);
  }

  /**
   * 指定した教科・学年のカテゴリを返す（referenceGrade が完全一致するもの）。
   */
  getCategoriesForGrade(subject: string, grade: string): Record<string, string> {
    return this.categoryRegistry.getCategoriesForGrade(subject, grade);
  }

  /**
   * 指定した教科の参考学年が未設定のカテゴリを返す。
   */
  getCategoriesWithoutGrade(subject: string): Record<string, string> {
    return this.categoryRegistry.getCategoriesWithoutGrade(subject);
  }

  /** 問題IDから問題を検索する（O(1)）。見つからない場合は undefined を返す。 */
  getQuestionById(questionId: string): Question | undefined {
    return this.questionsById.get(questionId);
  }

  /** すべての学習データを削除し、メモリキャッシュもリセットする。 */
  async clearAllData(): Promise<void> {
    await this.progressRepo.clearAllData();
    this.wrongIds = [];
    this.wrongSet = new Set();
    this.correctStreaks = {};
    this.masteredIds = [];
    this.masteredSet = new Set();
    this.questionStats = {};
    this.categoryStages = {};
  }

  // ─── カテゴリステージ管理 ──────────────────────────────────────────────────

  /**
   * 指定した単元の学習ステージ情報を返す。
   * ステージ: 0=未学習, 1=学習済, 2=復習済, 3=検定済
   */
  getCategoryStage(subject: string, categoryId: string): { stage: CategoryStage; lastCompletedAt: string | null } {
    const key = `${subject}::${categoryId}`;
    const record = this.categoryStages[key];
    if (!record) return { stage: 0, lastCompletedAt: null };
    return { stage: record.stage, lastCompletedAt: record.lastCompletedAt };
  }

  /**
   * 指定した単元のステージを1段階進める。
   * - ステージが 3 (検定済) の場合は何もしない。
   * - ステージが 0→1, 1→2 に進む場合: masteredIds と correctStreaks をリセット（再学習のため）。
   * - ステージが 2→3 に進む場合: リセットしない（検定済のため学習終了）。
   */
  advanceCategoryStage(subject: string, categoryId: string): void {
    const key = `${subject}::${categoryId}`;
    const current = this.categoryStages[key];
    const currentStage = current?.stage ?? 0;
    if (currentStage >= 3) return;

    const newStage = (currentStage + 1) as CategoryStage;
    const now = new Date().toISOString();
    this.categoryStages[key] = { stage: newStage, lastCompletedAt: now };
    this.progressRepo.saveCategoryStages(this.categoryStages);

    // ステージが検定済（3）未満の場合、この単元の mastery をリセットして再学習を促す
    if (newStage < 3) {
      const questionIds = new Set((this.questionsByCategory.get(`${subject}::${categoryId}`) ?? []).map((q) => q.id));
      this.masteredIds = this.masteredIds.filter((id) => !questionIds.has(id));
      for (const id of questionIds) {
        this.masteredSet.delete(id);
        delete this.correctStreaks[id];
        delete this.questionStats[id];
      }
      // wrongIds からも除いてクリーンな状態にする
      this.removeWrongIds(questionIds);
      this.progressRepo.saveMasteredIds(this.masteredIds);
      this.progressRepo.saveCorrectStreaks(this.correctStreaks);
      this.progressRepo.saveWrongIds(this.wrongIds);
      this.progressRepo.saveQuestionStats(this.questionStats);
    }
  }

  /**
   * 今日（YYYY-MM-DD）ステージが進んだ単元のユニーク数を返す。
   * ※ 同一単元が同日内に複数回ステージ遷移しても 1 件として数える（lastCompletedAt で判定）。
   * 学習状況の星表示で使用する。
   */
  getTodayAdvancedCount(): number {
    const today = new Date().toISOString().slice(0, 10);
    return Object.values(this.categoryStages).filter(
      (r) => r.lastCompletedAt != null && r.lastCompletedAt.startsWith(today),
    ).length;
  }

  /**
   * 全教科共通のおすすめ単元数設定を返す。
   */
  getGlobalRecommendedCount(): number {
    return this.progressRepo.loadGlobalRecommendedCount();
  }

  /**
   * 全教科共通のおすすめ単元数設定を保存する。
   */
  saveGlobalRecommendedCount(count: number): void {
    this.progressRepo.saveGlobalRecommendedCount(count);
  }

  /**
   * 全教科横断のおすすめ単元リストを返す（目標数＋α）。
   *
   * アルゴリズム:
   * 1. 各教科の「利用可能単元」を収集（検定済を除く、学年上限内、待機期間経過済み）
   * 2. 未学習単元（stage=0）と復習対象単元（stage>0 かつ待機期間経過）を分離
   * 3. 未学習は設定順、復習はランダムで交互に配置
   * 4. 目標数+α分を返す
   */
  getRecommendedUnitsGlobal(goalCount: number, alphaCount: number): GlobalRecommendedUnit[] {
    const total = goalCount + alphaCount;
    // 問題が登録されている教科を CategoryRegistry から取得する（ハードコード不要）
    const subjects = sortSubjectsByStudyPriority(this.categoryRegistry.getSubjects());
    const now = new Date();

    const unlearnedBySubject = new Map<string, GlobalRecommendedUnit[]>();
    const reviewReadyBySubject = new Map<string, GlobalRecommendedUnit[]>();
    subjects.forEach((subject) => {
      unlearnedBySubject.set(subject, []);
      reviewReadyBySubject.set(subject, []);
    });

    for (const subjectId of subjects) {
      const maxGrade = this._getUnlockedMaxGrade(subjectId);
      const categories = this.getCategoriesForSubject(subjectId);

      for (const [catId, catName] of Object.entries(categories)) {
        const key = `${subjectId}::${catId}`;
        const stageRecord = this.categoryStages[key];
        const stage = stageRecord?.stage ?? 0;

        // 検定済はスキップ
        if (stage >= 3) continue;

        // 前提単元チェック: 前提単元が未習得（stage=0）の場合はスキップ
        if (!this._arePrerequisitesMet(subjectId, catId)) continue;

        // 学年制限チェック
        const grade = this.categoryRegistry.getCategoryReferenceGrade(subjectId, catId);
        if (grade && maxGrade !== null && !isGradeWithinLimit(grade, maxGrade)) continue;

        const { mastered, total: totalQ } = this.getMasteredCountForCategory(subjectId, catId);

        // 履修済（全問マスター済み）はスキップ
        if (totalQ > 0 && mastered === totalQ) continue;
        const inProgressCount = this.getInProgressCount({ subject: subjectId, category: catId });
        const referenceGrade = this.categoryRegistry.getCategoryReferenceGrade(subjectId, catId);

        const unit: GlobalRecommendedUnit = {
          subject: subjectId,
          categoryId: catId,
          categoryName: catName,
          stage,
          lastCompletedAt: stageRecord?.lastCompletedAt ?? null,
          referenceGrade,
          mastered,
          totalQuestions: totalQ,
          inProgressCount,
          type: stage === 0 ? "unlearned" : "review",
        };

        if (stage === 0) {
          unlearnedBySubject.get(subjectId)?.push(unit);
        } else {
          // 待機期間チェック: 学習済(stage=1)→7日、復習済(stage=2)→14日
          const waitDays = stage === 1 ? 7 : 14;
          if (stageRecord && isWaitPeriodElapsed(stageRecord.lastCompletedAt, waitDays, now)) {
            reviewReadyBySubject.get(subjectId)?.push(unit);
          }
        }
      }
    }

    // 復習候補は教科ごとにランダム化し、未学習→復習→未学習…の順で交互に配置する。
    // 教科は 国語→数学→英語 を優先し、該当がない場合のみ同一教科を連続させる。
    reviewReadyBySubject.forEach((units) => shuffleArray(units));

    const result: GlobalRecommendedUnit[] = [];
    let nextUnlearnedSubjectIndex = 0;
    let nextReviewSubjectIndex = 0;
    let shouldPickUnlearned = true;

    while (result.length < total && (hasQueuedUnits(unlearnedBySubject) || hasQueuedUnits(reviewReadyBySubject))) {
      if (shouldPickUnlearned) {
        const nextUnlearned = dequeueNextUnit(unlearnedBySubject, subjects, nextUnlearnedSubjectIndex);
        if (nextUnlearned) {
          result.push(nextUnlearned.unit);
          nextUnlearnedSubjectIndex = nextUnlearned.nextSubjectIndex;
          shouldPickUnlearned = false;
          continue;
        }
      }

      const nextReview = dequeueNextUnit(reviewReadyBySubject, subjects, nextReviewSubjectIndex);
      if (nextReview) {
        result.push(nextReview.unit);
        nextReviewSubjectIndex = nextReview.nextSubjectIndex;
        shouldPickUnlearned = true;
        continue;
      }

      const fallbackUnlearned = dequeueNextUnit(unlearnedBySubject, subjects, nextUnlearnedSubjectIndex);
      if (fallbackUnlearned) {
        result.push(fallbackUnlearned.unit);
        nextUnlearnedSubjectIndex = fallbackUnlearned.nextSubjectIndex;
        shouldPickUnlearned = false;
        continue;
      }

      break;
    }

    return result.slice(0, total);
  }

  /**
   * 指定した教科・カテゴリの前提単元がすべて習得済みか判定する（公開 API）。
   * 前提単元の stage >= 1（学習済）の場合に満たされたとみなす。
   * 前提単元が設定されていない場合は常に true を返す。
   */
  arePrerequisitesMet(subjectId: string, catId: string): boolean {
    return this._arePrerequisitesMet(subjectId, catId);
  }

  /** 指定した教科・カテゴリの前提単元名一覧を返す（未設定時は空配列）。 */
  getCategoryPrerequisiteNames(subjectId: string, catId: string): string[] {
    const categories = this.getCategoriesForSubject(subjectId);
    return this.categoryRegistry
      .getCategoryPrerequisites(subjectId, catId)
      .map((prereqCatId) => categories[prereqCatId] ?? prereqCatId);
  }

  /**
   * 指定した教科・カテゴリの前提単元がすべて習得済みか判定する。
   * 前提単元の stage >= 1（学習済）の場合に満たされたとみなす。
   * 前提単元が設定されていない場合は常に true を返す。
   */
  private _arePrerequisitesMet(subjectId: string, catId: string): boolean {
    const prerequisites = this.categoryRegistry.getCategoryPrerequisites(subjectId, catId);
    if (prerequisites.length === 0) return true;
    return prerequisites.every((prereqCatId) => {
      const key = `${subjectId}::${prereqCatId}`;
      return (this.categoryStages[key]?.stage ?? 0) >= 1;
    });
  }

  /**
   * 指定教科で学習解禁されている最大学年を返す。
   * 全ての単元が 学習済（stage >= 1）となった学年の次学年を返す。
   * どの学年も全単元学習済みでない場合は最初の学年のみ許可（null=学年制限なし）。
   */
  private _getUnlockedMaxGrade(subjectId: string): string | null {
    const grades = this.categoryRegistry.getUniqueGradesForSubject(subjectId);
    if (grades.length === 0) return null; // 学年なし = 制限なし

    // 学年の昇順ソート
    const sortedGrades = [...grades].sort((a, b) => gradeOrder(a) - gradeOrder(b));

    let maxUnlockedIdx = -1;
    for (let i = 0; i < sortedGrades.length; i++) {
      const grade = sortedGrades[i]!;
      const categoriesInGrade = this.categoryRegistry.getCategoriesForGrade(subjectId, grade);
      const allLearned = Object.keys(categoriesInGrade).every((catId) => {
        const key = `${subjectId}::${catId}`;
        return (this.categoryStages[key]?.stage ?? 0) >= 1;
      });
      if (allLearned && Object.keys(categoriesInGrade).length > 0) {
        maxUnlockedIdx = i;
      } else {
        break; // 途中で学習済みでない学年があれば停止
      }
    }

    // maxUnlockedIdx = 解禁済みの最高学年インデックス
    // 次の学年 = maxUnlockedIdx + 1 が上限
    const limitIdx = maxUnlockedIdx + 1;
    if (limitIdx >= sortedGrades.length) return null; // 全学年解禁
    return sortedGrades[limitIdx] ?? sortedGrades[0] ?? null;
  }
}

// ─── グローバルおすすめ単元の型定義 ────────────────────────────────────────

/** グローバルおすすめ単元の1件 */
export interface GlobalRecommendedUnit {
  subject: string;
  categoryId: string;
  categoryName: string;
  stage: CategoryStage;
  lastCompletedAt: string | null;
  referenceGrade?: string;
  mastered: number;
  totalQuestions: number;
  inProgressCount: number;
  type: "unlearned" | "review";
}

// ─── モジュールプライベートヘルパー ────────────────────────────────────────

/** 参考学年文字列を数値に変換してソートに使う */
function gradeOrder(grade: string): number {
  const map: Record<string, number> = {
    小学1年: 1,
    小学2年: 2,
    小学3年: 3,
    小学4年: 4,
    小学5年: 5,
    小学6年: 6,
    中学1年: 7,
    中学2年: 8,
    中学3年: 9,
    高校1年: 10,
    高校2年: 11,
    高校3年: 12,
  };
  if (grade in map) return map[grade]!;
  // フォールバック: 先頭1文字で大まかな順序を決める
  if (grade.startsWith("小")) return 1;
  if (grade.startsWith("中")) return 7;
  if (grade.startsWith("高")) return 10;
  return 99;
}

/**
 * 指定学年が最大許可学年（maxGrade）以内かどうかを判定する。
 * maxGrade = null の場合は常に true（制限なし）。
 */
function isGradeWithinLimit(grade: string, maxGrade: string | null): boolean {
  if (maxGrade === null) return true;
  return gradeOrder(grade) <= gradeOrder(maxGrade);
}

/** 待機期間（日数）が経過しているかを判定する */
function isWaitPeriodElapsed(lastCompletedAt: string, waitDays: number, now: Date): boolean {
  const last = new Date(lastCompletedAt);
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= waitDays;
}

/** 配列をフィッシャー–イェーツ法でインプレースシャッフルする */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function sortSubjectsByStudyPriority(subjects: string[]): string[] {
  const priorityMap: Record<string, number> = {
    japanese: 0,
    math: 1,
    english: 2,
  };

  return [...subjects].sort((a, b) => {
    const aPriority = priorityMap[a] ?? Number.MAX_SAFE_INTEGER;
    const bPriority = priorityMap[b] ?? Number.MAX_SAFE_INTEGER;
    return aPriority - bPriority;
  });
}

/**
 * `startIndex` から教科優先順にキューを走査し、最初に取り出せる単元を返す。
 *
 * - `subjectOrder` の順序で巡回し、空でない最初の教科キューから `shift()` で 1 件取り出す
 * - `nextSubjectIndex` は、次回の探索開始位置として使う「取り出した教科の次のインデックス」
 * - すべての教科キューが空の場合は `null` を返す
 */
function dequeueNextUnit(
  queuesBySubject: Map<string, GlobalRecommendedUnit[]>,
  subjectOrder: string[],
  startIndex: number,
): { unit: GlobalRecommendedUnit; nextSubjectIndex: number } | null {
  if (subjectOrder.length === 0) return null;

  for (let offset = 0; offset < subjectOrder.length; offset++) {
    const subjectIndex = (startIndex + offset) % subjectOrder.length;
    const subject = subjectOrder[subjectIndex];
    if (!subject) continue;

    const queue = queuesBySubject.get(subject);
    const unit = queue?.shift();
    if (unit) {
      return {
        unit,
        nextSubjectIndex: (subjectIndex + 1) % subjectOrder.length,
      };
    }
  }

  return null;
}

function hasQueuedUnits(queuesBySubject: Map<string, GlobalRecommendedUnit[]>): boolean {
  return Array.from(queuesBySubject.values()).some((queue) => queue.length > 0);
}
