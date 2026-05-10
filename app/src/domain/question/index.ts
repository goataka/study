/**
 * Question ドメインの公開エントリーポイント。
 *
 * 役割ごとに分割されたモジュール（types / 検証 / 展開 / シャッフル）を
 * 1 つの公開 API として再エクスポートする。
 *
 * 既存コードは `import { ... } from "../domain/question"` で参照しており、
 * フォルダ化後もこの import パスが維持されるよう、ここで集約する。
 */

export type { Question, QuestionType, RawQuestion, QuestionFile, QuestionsManifest } from "./types";
export { validateManifest } from "./validateManifest";
export { validateQuestionFile } from "./validateQuestionFile";
export { expandQuestions } from "./expandQuestions";
export { shuffleChoices } from "./shuffleChoices";
