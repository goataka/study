/**
 * Question ドメインエンティティ・型定義・バリデーション関数。
 */

/** 問題データ（表示用にメタ情報を付加したもの） */
export interface Question {
  id: string;
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
  subject: string;
  subjectName: string;
  category: string;
  categoryName: string;
}

/** 各問題ファイルの生データ（メタ情報なし） */
export interface RawQuestion {
  id: string;
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
}

/** 問題ファイル1件のスキーマ */
export interface QuestionFile {
  subject: string;
  subjectName: string;
  category: string;
  categoryName: string;
  questions: RawQuestion[];
}

/** questions/index.json のスキーマ */
export interface QuestionsManifest {
  version: string;
  subjects: Record<string, { name: string }>;
  questionFiles: string[];
}

/**
 * マニフェストとして期待する基本構造を検証する。
 * 不正な場合は Error をスローします。
 */
export function validateManifest(data: unknown): asserts data is QuestionsManifest {
  if (!data || typeof data !== "object") {
    throw new Error("Manifest must be an object");
  }
  const manifest = data as Record<string, unknown>;
  if (typeof manifest.version !== "string") {
    throw new Error('Manifest must have a "version" string field');
  }
  if (!manifest.subjects || typeof manifest.subjects !== "object") {
    throw new Error('Manifest must have a "subjects" object');
  }
  if (!Array.isArray(manifest.questionFiles)) {
    throw new Error('Manifest must have a "questionFiles" array');
  }
}

/**
 * 問題ファイル1件を検証する。
 * 不正な場合は Error をスローします。
 */
export function validateQuestionFile(data: unknown): asserts data is QuestionFile {
  if (!data || typeof data !== "object") {
    throw new Error("QuestionFile must be an object");
  }
  const qf = data as Record<string, unknown>;
  for (const field of ["subject", "subjectName", "category", "categoryName"]) {
    if (typeof qf[field] !== "string") {
      throw new Error(`QuestionFile must have a "${field}" string field`);
    }
  }
  if (!Array.isArray(qf.questions)) {
    throw new Error('QuestionFile must have a "questions" array');
  }
  for (const [i, q] of (qf.questions as unknown[]).entries()) {
    if (!q || typeof q !== "object") {
      throw new Error(`Question at index ${i} must be an object`);
    }
    const qObj = q as Record<string, unknown>;
    for (const field of ["id", "question", "explanation"]) {
      if (typeof qObj[field] !== "string" || (qObj[field] as string).length === 0) {
        throw new Error(`Question[${i}].${field} must be a non-empty string`);
      }
    }
    if (!Array.isArray(qObj.choices) || qObj.choices.length !== 4) {
      throw new Error(`Question[${i}].choices must be an array of exactly 4 elements`);
    }
    for (const [ci, choice] of (qObj.choices as unknown[]).entries()) {
      if (typeof choice !== "string" || choice.trim().length === 0) {
        throw new Error(`Question[${i}].choices[${ci}] must be a non-empty string`);
      }
    }
    if (
      typeof qObj.correct !== "number" ||
      !Number.isInteger(qObj.correct) ||
      qObj.correct < 0 ||
      qObj.correct > 3
    ) {
      throw new Error(`Question[${i}].correct must be an integer between 0 and 3`);
    }
  }
}

/**
 * QuestionFile を Question[] に展開する（メタ情報を各問題に付加）。
 */
export function expandQuestions(qf: QuestionFile): Question[] {
  return qf.questions.map((q) => ({
    ...q,
    subject: qf.subject,
    subjectName: qf.subjectName,
    category: qf.category,
    categoryName: qf.categoryName,
  }));
}

/**
 * 問題の選択肢をシャッフルし、正解のインデックスを更新する。
 * 同じ問題IDに対して常に同じ順序を返すため、決定論的なシャッフルを行う。
 * @param question シャッフル対象の問題
 * @returns 選択肢がシャッフルされた新しい Question オブジェクト
 */
export function shuffleChoices(question: Question): Question {
  // 問題IDから決定論的な乱数シードを生成
  const seed = generateSeed(question.id);

  // シャッフル用のインデックス配列 [0, 1, 2, 3]
  const indices = [0, 1, 2, 3];

  // Fisher-Yates シャッフル（決定論的）
  const rng = createSeededRandom(seed);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }

  // シャッフルされた選択肢を作成
  const shuffledChoices = indices.map(i => question.choices[i]!);

  // 正解の新しいインデックスを見つける
  const newCorrectIndex = indices.indexOf(question.correct);

  return {
    ...question,
    choices: shuffledChoices,
    correct: newCorrectIndex,
  };
}

/**
 * 文字列から数値シードを生成する
 */
function generateSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32bit整数に変換
  }
  return Math.abs(hash);
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
