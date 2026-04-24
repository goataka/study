/**
 * Question ドメインエンティティ・型定義・バリデーション関数。
 */

/** 問題の種別 */
export type QuestionType = "multiple-choice" | "text-input";

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
  parentCategory?: string;
  parentCategoryName?: string;
  guideUrl?: string;
  /** 参考学年（例: "小学3年", "中学1年", "高校2年"） */
  referenceGrade?: string;
  /** 問題種別: "multiple-choice"（4択, デフォルト）または "text-input"（テキスト入力） */
  questionType?: QuestionType;
}

/** 各問題ファイルの生データ（メタ情報なし） */
export interface RawQuestion {
  id: string;
  question: string;
  choices: string[];
  correct: number;
  explanation: string;
  /** 問題種別（省略時はファイルまたはデフォルトの種別を継承） */
  questionType?: QuestionType;
}

/** 問題ファイル1件のスキーマ */
export interface QuestionFile {
  subject: string;
  subjectName: string;
  category: string;
  categoryName: string;
  parentCategory?: string;
  parentCategoryName?: string;
  guideUrl?: string;
  /** 参考学年（例: "小学3年", "中学1年", "高校2年"） */
  referenceGrade?: string;
  /** ファイル全体のデフォルト問題種別（省略時は "multiple-choice"） */
  questionType?: QuestionType;
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
  // parentCategory と parentCategoryName はオプション（両方あるか両方ないか）
  if (qf.parentCategory !== undefined || qf.parentCategoryName !== undefined) {
    if (typeof qf.parentCategory !== "string" || typeof qf.parentCategoryName !== "string") {
      throw new Error('If parentCategory or parentCategoryName is present, both must be strings');
    }
  }
  // guideUrl はオプションの文字列フィールド
  if (qf.guideUrl !== undefined) {
    if (typeof qf.guideUrl !== "string") {
      throw new Error('"guideUrl" must be a string if present');
    }
    // 安全なスキームのみ許可：../ で始まる相対パス（1階層上のみ、直後が . や / でない）または http/https の絶対URL
    // 例: ../math/arithmetic/... は許可, ..//path や ../.path, ../../../ は拒否
    const isRelative = /^\.\.\/[^./]/.test(qf.guideUrl);
    const isAbsolute = /^https?:\/\//i.test(qf.guideUrl);
    if (!isRelative && !isAbsolute) {
      throw new Error('"guideUrl" must be a relative path starting with "../" or an http/https URL');
    }
    // パストラバーサル防止：URL デコード後にさらなる ../ が含まれないことを確認
    if (isRelative) {
      let decoded = qf.guideUrl;
      try {
        decoded = decodeURIComponent(qf.guideUrl);
      } catch {
        // デコード失敗の場合は元の文字列で検証
      }
      // ../ 以降のパスに追加の .. が含まれないことを確認
      if (decoded.slice("../".length).includes("..")) {
        throw new Error('"guideUrl" must not contain path traversal sequences');
      }
    }
  }
  // referenceGrade はオプションの文字列フィールド
  if (qf.referenceGrade !== undefined && typeof qf.referenceGrade !== "string") {
    throw new Error('"referenceGrade" must be a string if present');
  }
  // questionType（ファイルレベル）はオプション
  if (qf.questionType !== undefined && qf.questionType !== "multiple-choice" && qf.questionType !== "text-input") {
    throw new Error('"questionType" must be "multiple-choice" or "text-input"');
  }
  const fileQuestionType = (qf.questionType as QuestionType | undefined) ?? "multiple-choice";

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
    // questionType（問題レベル）はオプション（ファイルレベルを継承）
    if (qObj.questionType !== undefined && qObj.questionType !== "multiple-choice" && qObj.questionType !== "text-input") {
      throw new Error(`Question[${i}].questionType must be "multiple-choice" or "text-input"`);
    }
    const qType: QuestionType = (qObj.questionType as QuestionType | undefined) ?? fileQuestionType;

    if (!Array.isArray(qObj.choices) || qObj.choices.length === 0) {
      throw new Error(`Question[${i}].choices must be a non-empty array`);
    }
    for (const [ci, choice] of (qObj.choices as unknown[]).entries()) {
      if (typeof choice !== "string" || choice.trim().length === 0) {
        throw new Error(`Question[${i}].choices[${ci}] must be a non-empty string`);
      }
    }

    if (qType === "multiple-choice") {
      if ((qObj.choices as unknown[]).length !== 4) {
        throw new Error(`Question[${i}].choices must be an array of exactly 4 elements`);
      }
      if (
        typeof qObj.correct !== "number" ||
        !Number.isInteger(qObj.correct) ||
        qObj.correct < 0 ||
        qObj.correct > 3
      ) {
        throw new Error(`Question[${i}].correct must be an integer between 0 and 3`);
      }
    } else {
      // text-input: correct は choices の有効なインデックス
      if (
        typeof qObj.correct !== "number" ||
        !Number.isInteger(qObj.correct) ||
        qObj.correct < 0 ||
        qObj.correct >= (qObj.choices as unknown[]).length
      ) {
        throw new Error(`Question[${i}].correct must be a valid index into choices`);
      }
    }
  }
}

/**
 * QuestionFile を Question[] に展開する（メタ情報を各問題に付加）。
 */
export function expandQuestions(qf: QuestionFile): Question[] {
  const fileQuestionType = qf.questionType ?? "multiple-choice";
  return qf.questions.map((q) => ({
    ...q,
    subject: qf.subject,
    subjectName: qf.subjectName,
    category: qf.category,
    categoryName: qf.categoryName,
    parentCategory: qf.parentCategory,
    parentCategoryName: qf.parentCategoryName,
    guideUrl: qf.guideUrl,
    referenceGrade: qf.referenceGrade,
    questionType: q.questionType ?? fileQuestionType,
  }));
}

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
