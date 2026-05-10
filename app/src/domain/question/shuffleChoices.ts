/**
 * 問題選択肢のシャッフルロジック。
 *
 * 同じ問題IDに対しては常に同じ並びを返す決定論的シャッフル
 * （`QuestionId` ValueObject から派生したシードを使用）。
 */

import type { Question } from "./types";
import { QuestionId } from "../valueObjects/QuestionId";

/**
 * 問題の選択肢をシャッフルし、正解のインデックスを更新する。
 * text-input 問題はシャッフルをスキップして元の問題をそのまま返す。
 * 同じ問題IDに対して常に同じ順序を返すため、決定論的なシャッフルを行う。
 * @param question シャッフル対象の問題
 * @returns 選択肢がシャッフルされた新しい Question オブジェクト
 */
export function shuffleChoices(question: Question): Question {
  // text-input 問題はシャッフルしない
  if (question.questionType === "text-input") {
    return question;
  }

  // 問題ID（ValueObject）から決定論的な乱数シードを生成
  const seed = QuestionId.from(question.id).toSeed();

  // シャッフル用のインデックス配列 [0, 1, 2, 3]
  const indices = [0, 1, 2, 3];

  // Fisher-Yates シャッフル（決定論的）
  const rng = createSeededRandom(seed);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }

  // シャッフルされた選択肢を作成
  const shuffledChoices = indices.map((i) => question.choices[i]!);

  // 正解の新しいインデックスを見つける
  const newCorrectIndex = indices.indexOf(question.correct);

  return {
    ...question,
    choices: shuffledChoices,
    correct: newCorrectIndex,
  };
}

/**
 * シード付き疑似乱数生成器を作成する（LCGアルゴリズム）
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // Linear Congruential Generator
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x80000000;
  };
}
