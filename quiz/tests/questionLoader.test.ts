/**
 * questionLoader.ts の純粋関数ロジックのテスト
 * （fetch を使う関数はブラウザ環境が必要なためここでは対象外）
 */

import { validateManifest, validateQuestionFile } from "../src/questionLoader";

describe("validateManifest", () => {
  test("有効なマニフェストを受け入れる", () => {
    expect(() =>
      validateManifest({
        version: "2.0.0",
        subjects: { english: { name: "英語" } },
        questionFiles: ["english/phonics-1.json"],
      })
    ).not.toThrow();
  });

  test("null を拒否する", () => {
    expect(() => validateManifest(null)).toThrow();
  });

  test("version がない場合に拒否する", () => {
    expect(() =>
      validateManifest({ subjects: {}, questionFiles: [] })
    ).toThrow();
  });

  test("subjects がない場合に拒否する", () => {
    expect(() =>
      validateManifest({ version: "1.0.0", questionFiles: [] })
    ).toThrow();
  });

  test("questionFiles が配列でない場合に拒否する", () => {
    expect(() =>
      validateManifest({ version: "1.0.0", subjects: {}, questionFiles: "not-an-array" })
    ).toThrow();
  });
});

describe("validateQuestionFile", () => {
  const validQF = {
    subject: "english",
    subjectName: "英語",
    category: "phonics-1",
    categoryName: "フォニックス（1文字）",
    questions: [
      {
        id: "test-1",
        question: "テスト問題",
        choices: ["ア", "イ", "ウ", "エ"],
        correct: 0,
        explanation: "解説",
      },
    ],
  };

  test("有効な問題ファイルを受け入れる", () => {
    expect(() => validateQuestionFile(validQF)).not.toThrow();
  });

  test("null を拒否する", () => {
    expect(() => validateQuestionFile(null)).toThrow();
  });

  test("subject がない場合に拒否する", () => {
    const { subject, ...rest } = validQF;
    expect(() => validateQuestionFile(rest)).toThrow();
  });

  test("questions が配列でない場合に拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, questions: "not-an-array" })
    ).toThrow();
  });
});
