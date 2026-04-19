/**
 * Question ドメイン — 仕様テスト
 *
 * バリデーション規則を実行可能な仕様として記述します。
 */

import { validateManifest, validateQuestionFile, expandQuestions } from "./question";
import type { QuestionFile } from "./question";

describe("validateManifest — マニフェスト検証仕様", () => {
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
    expect(() => validateManifest(null)).toThrow("Manifest must be an object");
  });

  it("version フィールドがない場合に拒否する", () => {
    expect(() =>
      validateManifest({ subjects: {}, questionFiles: [] })
    ).toThrow('Manifest must have a "version" string field');
  });

  it("subjects フィールドがない場合に拒否する", () => {
    expect(() =>
      validateManifest({ version: "1.0.0", questionFiles: [] })
    ).toThrow('Manifest must have a "subjects" object');
  });

  it("questionFiles が配列でない場合に拒否する", () => {
    expect(() =>
      validateManifest({ version: "1.0.0", subjects: {}, questionFiles: "not-an-array" })
    ).toThrow('Manifest must have a "questionFiles" array');
  });
});

describe("validateQuestionFile — 問題ファイル検証仕様", () => {
  const validQF: QuestionFile = {
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
    expect(() => validateQuestionFile(null)).toThrow("QuestionFile must be an object");
  });

  it("subject フィールドがない場合に拒否する", () => {
    const { subject: _subject, ...rest } = validQF;
    expect(() => validateQuestionFile(rest)).toThrow('QuestionFile must have a "subject" string field');
  });

  it("questions が配列でない場合に拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, questions: "not-an-array" })
    ).toThrow('QuestionFile must have a "questions" array');
  });

  it("選択肢が4つでない場合に拒否する", () => {
    const badQF = {
      ...validQF,
      questions: [{ ...validQF.questions[0]!, choices: ["ア", "イ", "ウ"] }],
    };
    expect(() => validateQuestionFile(badQF)).toThrow("exactly 4 elements");
  });

  it("correct が範囲外の場合に拒否する", () => {
    const badQF = {
      ...validQF,
      questions: [{ ...validQF.questions[0]!, correct: 5 }],
    };
    expect(() => validateQuestionFile(badQF)).toThrow("integer between 0 and 3");
  });
});

describe("expandQuestions — 問題展開仕様", () => {
  const qf: QuestionFile = {
    subject: "math",
    subjectName: "数学",
    category: "addition",
    categoryName: "足し算",
    questions: [
      { id: "m-1", question: "1+1=?", choices: ["1", "2", "3", "4"], correct: 1, explanation: "1+1=2" },
      { id: "m-2", question: "2+2=?", choices: ["2", "3", "4", "5"], correct: 2, explanation: "2+2=4" },
    ],
  };

  it("各問題にメタ情報（subject, category など）が付加される", () => {
    const questions = expandQuestions(qf);
    expect(questions).toHaveLength(2);
    for (const q of questions) {
      expect(q.subject).toBe("math");
      expect(q.subjectName).toBe("数学");
      expect(q.category).toBe("addition");
      expect(q.categoryName).toBe("足し算");
    }
  });

  it("元の問題フィールドが保持される", () => {
    const questions = expandQuestions(qf);
    expect(questions[0]!.id).toBe("m-1");
    expect(questions[1]!.id).toBe("m-2");
  });
});
