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
import { CategoryStageService } from "./categoryStageService";
import { GlobalRecommendationService } from "./globalRecommendationService";
import { QuizProgressService } from "./quizProgressService";
import type {
  IQuestionRepository,
  IProgressRepository,
  QuizRecord,
  UserDataExport,
  CategoryStageRecord,
  CategoryStage,
} from "./ports";
import type { GlobalRecommendedUnit } from "./globalRecommendationService";

export type { QuizMode, QuizFilter, AnswerResult, QuizRecord, UserDataExport };
export type { CategoryStageRecord, CategoryStage };
export type { GlobalRecommendedUnit } from "./globalRecommendationService";
export type { Question } from "../domain/question";
export { shuffleChoices } from "../domain/question";
export type { QuizSession } from "../domain/quizSession";

/** 全問習得済み時にスローするエラーメッセージ定数 */
export const ERROR_ALL_MASTERED = "ALL_MASTERED";
/** 未回答時の表示テキスト */
export const NO_ANSWER_TEXT = "未回答";

export class QuizUseCase {
  private allQuestions: Question[] = [];
  /** カテゴリ階層・メタデータのドメインオブジェクト（initialize() で構築） */
  private categoryRegistry: CategoryRegistry = new CategoryRegistry([]);
  /** questionId -> Question のキャッシュ（O(1) 参照用） */
  private questionsById = new Map<string, Question>();
  /** "subject::categoryId" -> その単元の問題一覧（initialize() で構築、静的） */
  private questionsByCategory = new Map<string, Question[]>();
  private readonly quizProgress: QuizProgressService;
  private readonly categoryStages: CategoryStageService;

  constructor(
    private readonly questionRepo: IQuestionRepository,
    private readonly progressRepo: IProgressRepository,
  ) {
    this.quizProgress = new QuizProgressService(this.progressRepo);
    this.categoryStages = new CategoryStageService(this.progressRepo, this.quizProgress);
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
    return filtered.filter((question) => this.quizProgress.isWrong(question.id)).length;
  }

  /**
   * 指定したフィルターに一致する問題のうち、1回以上回答済みで未習得の問題数を返す。
   * 進捗バーの「学習中」カウントに使用する。
   */
  getInProgressCount(filter: QuizFilter): number {
    return this.quizProgress.getInProgressCount(this.getFilteredQuestions(filter));
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
    return this.quizProgress.getQuestionStat(questionId);
  }

  /**
   * 全問題の回答統計を一括で返す（浅いコピー）。
   * ループ内での個別呼び出しを避け、パフォーマンスを改善するために使用する。
   * 呼び出し側のミューテートがユースケース内部状態に影響しないよう浅いコピーを返す。
   */
  getAllQuestionStats(): Record<string, { total: number; correct: number }> {
    return this.quizProgress.getAllQuestionStats();
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
      const unmastered = filtered.filter((question) => !this.quizProgress.isMastered(question.id));
      if (unmastered.length === 0) {
        throw new Error(ERROR_ALL_MASTERED);
      }
      const questions = QuizSession.pickRandom(unmastered, count);
      return new QuizSession(questions);
    } else if (mode === "practice") {
      const unmastered = filtered.filter((question) => !this.quizProgress.isMastered(question.id));
      if (unmastered.length === 0) {
        throw new Error(ERROR_ALL_MASTERED);
      }
      const questions = QuizSession.pickInOrder(unmastered, count);
      return new QuizSession(questions);
    } else {
      const retryQuestions = filtered.filter((question) => this.quizProgress.isWrong(question.id));
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
    this.quizProgress.submit(results, (question) => this.getCategoryStage(question.subject, question.category).stage);
  }

  getMasteredIds(): string[] {
    return this.quizProgress.getMasteredIds();
  }

  isMastered(questionId: string): boolean {
    return this.quizProgress.isMastered(questionId);
  }

  getCorrectStreak(questionId: string): number {
    return this.quizProgress.getCorrectStreak(questionId);
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
    this.quizProgress.reload();
    this.categoryStages.reload();
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

    this.quizProgress.markQuestionsAsLearned(new Set(questions.map((question) => question.id)));

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

    this.quizProgress.unmarkQuestionsAsLearned(new Set(questions.map((question) => question.id)));
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
      if (question.subject !== subject || !this.quizProgress.isWrong(question.id)) continue;
      wrongCountsByCategory.set(question.category, (wrongCountsByCategory.get(question.category) ?? 0) + 1);
    }

    const result: { id: string; name: string; referenceGrade?: string; isLearned: boolean }[] = [];
    for (const [catId, catName] of entries) {
      if (result.length >= count) break;
      const key = `${subject}::${catId}`;
      const wrongCount = wrongCountsByCategory.get(catId) ?? 0;
      const isLearned = studiedKeys.has(key) && wrongCount === 0;
      if (!isLearned && this.arePrerequisitesMet(subject, catId)) {
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
        if (isLearned && !addedIds.has(catId) && this.arePrerequisitesMet(subject, catId)) {
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
    const key = `${subject}::${categoryId}`;
    return this.quizProgress.getCategoryProgressPct(questions, this.getStudiedCategoryKeys().has(key));
  }

  /**
   * 指定した教科・カテゴリの学習済み（習得済み）問題数と総問題数を返す。
   */
  getMasteredCountForCategory(subject: string, categoryId: string): { mastered: number; total: number } {
    const questions = this.questionsByCategory.get(`${subject}::${categoryId}`) ?? [];
    return this.quizProgress.getMasteredCount(questions);
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
    return this.quizProgress.getWrongIds();
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
    this.quizProgress.clear();
    this.categoryStages.clear();
  }

  // ─── カテゴリステージ管理 ──────────────────────────────────────────────────

  /**
   * 指定した単元の学習ステージ情報を返す。
   * ステージ: 0=未学習, 1=学習済, 2=復習済, 3=検定済
   */
  getCategoryStage(subject: string, categoryId: string): { stage: CategoryStage; lastCompletedAt: string | null } {
    return this.categoryStages.get(subject, categoryId);
  }

  /**
   * 指定した単元のステージを1段階進める。
   * - ステージが 3 (検定済) の場合は何もしない。
   * - ステージが 0→1, 1→2 に進む場合: masteredIds と correctStreaks をリセット（再学習のため）。
   * - ステージが 2→3 に進む場合: リセットしない（検定済のため学習終了）。
   */
  advanceCategoryStage(subject: string, categoryId: string): void {
    this.categoryStages.advance(subject, categoryId, this.questionsByCategory.get(`${subject}::${categoryId}`) ?? []);
  }

  /**
   * 今日（YYYY-MM-DD）ステージが進んだ単元のユニーク数を返す。
   * ※ 同一単元が同日内に複数回ステージ遷移しても 1 件として数える（lastCompletedAt で判定）。
   * 学習状況の星表示で使用する。
   */
  getTodayAdvancedCount(): number {
    return this.categoryStages.getTodayAdvancedCount();
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
    return this.createGlobalRecommendationService().getRecommendedUnits(goalCount, alphaCount);
  }

  /**
   * 指定した教科・カテゴリの前提単元がすべて習得済みか判定する（公開 API）。
   * 前提単元の stage >= 1（学習済）の場合に満たされたとみなす。
   * 前提単元が設定されていない場合は常に true を返す。
   */
  arePrerequisitesMet(subjectId: string, catId: string): boolean {
    return this.createGlobalRecommendationService().arePrerequisitesMet(subjectId, catId);
  }

  /** 指定した教科・カテゴリの前提単元名一覧を返す（未設定時は空配列）。 */
  getCategoryPrerequisiteNames(subjectId: string, catId: string): string[] {
    const categories = this.getCategoriesForSubject(subjectId);
    return this.categoryRegistry
      .getCategoryPrerequisites(subjectId, catId)
      .map((prereqCatId) => categories[prereqCatId] ?? prereqCatId);
  }

  private createGlobalRecommendationService(): GlobalRecommendationService {
    return new GlobalRecommendationService(
      this.categoryRegistry,
      (subject, categoryId) => this.categoryStages.get(subject, categoryId),
      (subject, categoryId) => this.getMasteredCountForCategory(subject, categoryId),
      (subject, categoryId) => this.getInProgressCount({ subject, category: categoryId }),
    );
  }
}
