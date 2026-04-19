/**
 * RemoteQuestionRepository — unit tests
 * Tests the validation functions used by the repository (domain logic).
 */

import { validateManifest, validateQuestionFile } from "../domain/question";

describe("validateManifest — リモートリポジトリで使用するバリデーション仕様", () => {
  it("有効なマニフェストを受け入れる", () => {
    expect(() =>
      validateManifest({
        version: "2.0.0",
        subjects: { english: { name: "英語" } },
        questionFiles: ["english/phonics-1.json"],
      })
    ).not.toThrow();
  });

  it("null を拒否する", () => {
    expect(() => validateManifest(null)).toThrow();
  });

  it("version がない場合に拒否する", () => {
    expect(() =>
      validateManifest({ subjects: {}, questionFiles: [] })
    ).toThrow();
  });

  it("subjects がない場合に拒否する", () => {
    expect(() =>
      validateManifest({ version: "1.0.0", questionFiles: [] })
    ).toThrow();
  });

  it("questionFiles が配列でない場合に拒否する", () => {
    expect(() =>
      validateManifest({ version: "1.0.0", subjects: {}, questionFiles: "not-an-array" })
    ).toThrow();
  });
});

describe("validateQuestionFile — リモートリポジトリで使用するバリデーション仕様", () => {
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

  it("有効な問題ファイルを受け入れる", () => {
    expect(() => validateQuestionFile(validQF)).not.toThrow();
  });

  it("null を拒否する", () => {
    expect(() => validateQuestionFile(null)).toThrow();
  });

  it("subject がない場合に拒否する", () => {
    const { subject: _removedField, ...rest } = validQF;
    expect(() => validateQuestionFile(rest)).toThrow();
  });

  it("questions が配列でない場合に拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, questions: "not-an-array" })
    ).toThrow();
  });
});
