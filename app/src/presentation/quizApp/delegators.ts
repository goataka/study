/**
 * QuizApp デリゲータのバレル再エクスポート。
 *
 * 実装は `delegators/rendering.ts` と `delegators/lifecycle.ts` に分割されている。
 * QuizApp 本体からは `import * as D from "./quizApp/delegators"` でまとめてアクセスする。
 */

export * from "./delegators/rendering";
export * from "./delegators/lifecycle";
