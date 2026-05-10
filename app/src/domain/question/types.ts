/**
 * Question ドメインの型定義。
 *
 * 副作用を持たない純粋な型のみを定義し、検証ロジック・展開ロジック・
 * シャッフルロジックは同フォルダ内の専用モジュールに分離する。
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
  /** 3階層目を使う場合のトップカテゴリ（例: "pronunciation"）。省略時は2階層 */
  topCategory?: string;
  topCategoryName?: string;
  parentCategory?: string;
  parentCategoryName?: string;
  guideUrl?: string;
  /** 親カテゴリの解説 URL（省略可）。親カテゴリグループのガイドページへのリンク */
  parentCategoryGuideUrl?: string;
  /** トップカテゴリの解説 URL（省略可）。トップカテゴリグループのガイドページへのリンク */
  topCategoryGuideUrl?: string;
  /** カテゴリの代表例文（省略可）。バッククォートで囲まれた部分が強調表示される */
  example?: string;
  /** 参考学年（例: "小学3年", "中学1年", "高校2年"） */
  referenceGrade?: string;
  /** 単元の簡単な説明（省略可）。学習ガイドの冒頭に記載されているような1〜2文の概要 */
  description?: string;
  /** 問題種別: "multiple-choice"（4択, デフォルト）または "text-input"（テキスト入力） */
  questionType?: QuestionType;
  /** text-input 問題で大文字/小文字を区別するか（デフォルト: false） */
  caseSensitive?: boolean;
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
  /** text-input 問題で大文字/小文字を区別するか（ファイルレベルの設定を継承） */
  caseSensitive?: boolean;
}

/** 問題ファイル1件のスキーマ */
export interface QuestionFile {
  subject: string;
  subjectName: string;
  category: string;
  categoryName: string;
  /** 3階層目を使う場合のトップカテゴリ（例: "pronunciation"）。省略時は2階層 */
  topCategory?: string;
  topCategoryName?: string;
  parentCategory?: string;
  parentCategoryName?: string;
  guideUrl?: string;
  /** 親カテゴリの解説 URL（省略可）。親カテゴリグループのガイドページへのリンク */
  parentCategoryGuideUrl?: string;
  /** トップカテゴリの解説 URL（省略可）。トップカテゴリグループのガイドページへのリンク */
  topCategoryGuideUrl?: string;
  /** カテゴリの代表例文（省略可）。バッククォートで囲まれた部分が強調表示される */
  example?: string;
  /** 参考学年（例: "小学3年", "中学1年", "高校2年"） */
  referenceGrade?: string;
  /** 単元の簡単な説明（省略可）。学習ガイドの冒頭に記載されているような1〜2文の概要 */
  description?: string;
  /** ファイル全体のデフォルト問題種別（省略時は "multiple-choice"） */
  questionType?: QuestionType;
  /** text-input 問題で大文字/小文字を区別するか（省略時: false） */
  caseSensitive?: boolean;
  questions: RawQuestion[];
}

/** questions/index.json のスキーマ */
export interface QuestionsManifest {
  version: string;
  subjects: Record<string, { name: string }>;
  questionFiles: string[];
}
