/**
 * QuizApp の各種ユーザー設定の永続化ヘルパー群（純粋関数）。
 *
 * `IProgressRepository` を介してユーザー名・フォントサイズ・共有 URL・クイズ設定・
 * おすすめ単元数を読み書きする。DOM への反映はそれぞれの専用ヘルパー
 * （`fontSizeStore`, `userNameEditor` など）に委譲する。
 */

import type { IProgressRepository } from "../../application/ports";
import { setFontSizeLevel, syncFontSizeDom } from "../components/fontSizeStore";
import { setQuizSettings } from "../components/startScreen/quizSettingsStore";
import { sanitizeShareUrl } from "../uiHelpers";
import type { FontSizeLevel } from "../components/fontSizeStore";

/** クイズ実行時の設定値。 */
export interface QuizSettingsState {
  questionCount: number;
  quizOrder: "random" | "straight";
  includeMastered: boolean;
}

/**
 * 永続化されているユーザー名を読み込む。未設定時はフォールバック値を返す。
 */
export function loadUserName(repo: IProgressRepository, fallback: string): string {
  const saved = repo.loadUserName();
  return saved ?? fallback;
}

/**
 * 永続化されているフォントサイズレベルを読み込み、DOM へ即時反映する。
 * 復元時は永続化を行わない（既に保存済みのため）。
 */
export function loadFontSize(repo: IProgressRepository, fallback: FontSizeLevel): FontSizeLevel {
  const saved = repo.loadFontSizeLevel();
  const level = saved ?? fallback;
  setFontSizeLevel(level);
  syncFontSizeDom(level);
  return level;
}

/**
 * フォントサイズを DOM に適用しつつ、必要なら永続化する。
 */
export function applyFontSize(repo: IProgressRepository, level: FontSizeLevel, persist = true): void {
  setFontSizeLevel(level);
  syncFontSizeDom(level);
  if (persist) repo.saveFontSizeLevel(level);
}

/**
 * 永続化されている共有 URL を読み込み、http/https 以外のスキームを除外して返す。
 */
export function loadShareUrl(repo: IProgressRepository): string {
  const stored = repo.loadShareUrl();
  return sanitizeShareUrl(stored);
}

/**
 * 共有 URL を検証して保存し、サニタイズ済みの値を返す。
 */
export function saveShareUrl(repo: IProgressRepository, url: string): string {
  const sanitized = sanitizeShareUrl(url);
  repo.saveShareUrl(sanitized);
  return sanitized;
}

/**
 * 永続化されているクイズ設定を読み込み、対応するラジオボタンの checked を更新する。
 * 同時に React 共有ストア (`quizSettingsStore`) にも反映し、`<QuizPanel>` の
 * 制御コンポーネントが正しい初期値を表示できるようにする。
 */
export function loadQuizSettings(repo: IProgressRepository): QuizSettingsState {
  const settings = repo.loadQuizSettings();

  // ストア側を更新（React 制御コンポーネントの真の値）。
  // setQuizSettings は値が変化していなければ no-op。
  setQuizSettings({
    questionCount: settings.questionCount,
    quizOrder: settings.quizOrder,
    includeMastered: settings.includeMastered,
  });

  // 後方互換: 静的 HTML を使う既存テスト向けに DOM の checked も同期する。
  // React マウント時は controlled component が同じ checked を出力するため二重書き込みは無害。
  const countInput = document.querySelector<HTMLInputElement>(
    `input[name="questionCount"][value="${settings.questionCount}"]`,
  );
  if (countInput) countInput.checked = true;
  const orderInput = document.querySelector<HTMLInputElement>(`input[name="quizOrder"][value="${settings.quizOrder}"]`);
  if (orderInput) orderInput.checked = true;
  const learnedInput = document.querySelector<HTMLInputElement>(
    `input[name="quizLearned"][value="${settings.includeMastered ? "include" : "exclude"}"]`,
  );
  if (learnedInput) learnedInput.checked = true;

  return {
    questionCount: settings.questionCount,
    quizOrder: settings.quizOrder,
    includeMastered: settings.includeMastered,
  };
}

/**
 * クイズ設定を永続化する。
 */
export function saveQuizSettings(repo: IProgressRepository, settings: QuizSettingsState): void {
  repo.saveQuizSettings(settings);
}

/**
 * 現在 DOM 上で選択されている `questionCount` の値を読み取る。
 * 未選択の場合は fallback を返す。
 *
 * React 制御コンポーネント (`<QuizPanel>`) でも `checked` 属性は DOM に反映されるため、
 * `:checked` セレクタで読める。したがってストアと DOM のどちらが先に
 * 設定されていても本関数は正しい値を返す。
 */
export function loadQuestionCountFromDom(fallback: number): number {
  const checked = document.querySelector<HTMLInputElement>('input[name="questionCount"]:checked');
  return checked ? parseInt(checked.value, 10) : fallback;
}

/**
 * 教科ごとのおすすめ単元数を読み込み、Map として返す。
 */
export function loadRecommendedCounts(repo: IProgressRepository): Map<string, number> {
  const map = new Map<string, number>();
  const counts = repo.loadRecommendedCounts();
  for (const [subjectId, count] of Object.entries(counts)) {
    map.set(subjectId, count);
  }
  return map;
}

/**
 * 教科ごとのおすすめ単元数を永続化する。
 */
export function saveRecommendedCounts(repo: IProgressRepository, counts: Map<string, number>): void {
  const obj: Record<string, number> = {};
  counts.forEach((count, subjectId) => {
    obj[subjectId] = count;
  });
  repo.saveRecommendedCounts(obj);
}

/**
 * 全教科共通のおすすめ単元数（グローバル目標数）を読み込む。
 * 未設定時はデフォルト値 5 を返す。
 */
export function loadGlobalRecommendedCount(repo: IProgressRepository): number {
  return repo.loadGlobalRecommendedCount();
}

/**
 * 全教科共通のおすすめ単元数（グローバル目標数）を永続化する。
 */
export function saveGlobalRecommendedCount(repo: IProgressRepository, count: number): void {
  repo.saveGlobalRecommendedCount(count);
}
