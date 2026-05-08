/**
 * QuizApp の各種ユーザー設定の永続化ヘルパー群（純粋関数）。
 *
 * `IProgressRepository` を介してユーザー名・フォントサイズ・共有 URL・クイズ設定・
 * おすすめ単元数を読み書きする。DOM への反映はそれぞれの専用ヘルパー
 * （`fontSizeManager`, `userNameEditor` など）に委譲する。
 */

import type { IProgressRepository } from "../../application/ports";
import { sanitizeShareUrl } from "../uiHelpers";
import { applyFontSizeToDom, type FontSizeLevel } from "./fontSizeManager";

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
  applyFontSizeToDom(level, false, (l) => repo.saveFontSizeLevel(l));
  return level;
}

/**
 * フォントサイズを DOM に適用しつつ、必要なら永続化する。
 */
export function applyFontSize(repo: IProgressRepository, level: FontSizeLevel, persist = true): void {
  applyFontSizeToDom(level, persist, (l) => repo.saveFontSizeLevel(l));
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
 */
export function loadQuizSettings(repo: IProgressRepository): QuizSettingsState {
  const settings = repo.loadQuizSettings();

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
