/**
 * Question ドメイン — 仕様テスト
 *
 * バリデーション規則を実行可能な仕様として記述します。
 */

import { validateManifest, validateQuestionFile, expandQuestions, shuffleChoices } from "./question";
import type { QuestionFile, Question } from "./question";

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

  it("guideUrl が文字列でない場合に拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: 123 })
    ).toThrow('"guideUrl" must be a string if present');
  });

  it("guideUrl が ../contents/ 相対パスの場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "../contents/english/pronunciation/01-alphabet/guide" })
    ).not.toThrow();
  });

  it("guideUrl が https URL の場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "https://example.com/guide" })
    ).not.toThrow();
  });

  it("guideUrl が javascript: スキームの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "javascript:alert(1)" })
    ).toThrow('"guideUrl" must be a relative path under "../contents/" or an http/https URL');
  });

  it("guideUrl が data: スキームの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "data:text/html,<script>alert(1)</script>" })
    ).toThrow('"guideUrl" must be a relative path under "../contents/" or an http/https URL');
  });

  it("guideUrl が想定外の相対パスの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "./guide.md" })
    ).toThrow('"guideUrl" must be a relative path under "../contents/" or an http/https URL');
  });

  it("guideUrl にパストラバーサルが含まれる場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "../contents/english/../../etc/passwd" })
    ).toThrow('"guideUrl" must not contain path traversal sequences');
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

describe("shuffleChoices — 選択肢シャッフル仕様", () => {
  const question: Question = {
    id: "test-shuffle-1",
    question: "テスト問題",
    choices: ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
    correct: 0,
    explanation: "解説",
    subject: "test",
    subjectName: "テスト",
    category: "test-cat",
    categoryName: "テストカテゴリ",
  };

  it("元の問題を変更せず、同じ要素数の選択肢を返す", () => {
    const originalChoices = [...question.choices];
    const shuffled = shuffleChoices(question);
    expect(shuffled).not.toBe(question);
    expect(question.choices).toEqual(originalChoices);
    expect(shuffled.choices).toHaveLength(question.choices.length);
  });

  it("すべての選択肢が保持される", () => {
    const shuffled = shuffleChoices(question);
    expect(shuffled.choices).toHaveLength(4);
    // すべての元の選択肢が含まれているか確認
    for (const choice of question.choices) {
      expect(shuffled.choices).toContain(choice);
    }
  });

  it("正解のインデックスが正しく更新される", () => {
    const shuffled = shuffleChoices(question);
    // シャッフル後も正解の選択肢は元の正解と同じ内容であるべき
    const originalCorrectChoice = question.choices[question.correct];
    const shuffledCorrectChoice = shuffled.choices[shuffled.correct];
    expect(shuffledCorrectChoice).toBe(originalCorrectChoice);
  });

  it("同じIDの問題は常に同じシャッフル結果を返す（決定論的）", () => {
    const shuffled1 = shuffleChoices(question);
    const shuffled2 = shuffleChoices(question);
    expect(shuffled1.choices).toEqual(shuffled2.choices);
    expect(shuffled1.correct).toBe(shuffled2.correct);
  });

  it("異なるIDの問題は異なるシャッフル結果を返す", () => {
    const question2 = { ...question, id: "test-shuffle-2" };
    const shuffled1 = shuffleChoices(question);
    const shuffled2 = shuffleChoices(question2);
    // 異なるIDでは、choices または correct の少なくとも一方が変わることを確認する
    const isSameChoices = shuffled1.choices.every((choice, index) => choice === shuffled2.choices[index]);
    const isSameCorrect = shuffled1.correct === shuffled2.correct;
    expect(isSameChoices && isSameCorrect).toBe(false);
  });

  it("正解が最後の位置にある場合も正しくシャッフルされる", () => {
    const q = { ...question, correct: 3 };
    const shuffled = shuffleChoices(q);
    const originalCorrectChoice = q.choices[q.correct];
    const shuffledCorrectChoice = shuffled.choices[shuffled.correct];
    expect(shuffledCorrectChoice).toBe(originalCorrectChoice);
  });
});

describe("validateQuestionFile — parentCategory/parentCategoryName 検証仕様", () => {
  const validQFBase = {
    subject: "english",
    subjectName: "英語",
    category: "tenses",
    categoryName: "時制",
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

  it("parentCategory と parentCategoryName が両方文字列なら受け入れる", () => {
    expect(() =>
      validateQuestionFile({
        ...validQFBase,
        parentCategory: "grammar",
        parentCategoryName: "文法",
      })
    ).not.toThrow();
  });

  it("parentCategory だけ存在し parentCategoryName がない場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQFBase, parentCategory: "grammar" })
    ).toThrow("both must be strings");
  });

  it("parentCategoryName だけ存在し parentCategory がない場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQFBase, parentCategoryName: "文法" })
    ).toThrow("both must be strings");
  });

  it("どちらも省略した場合は受け入れる", () => {
    expect(() => validateQuestionFile(validQFBase)).not.toThrow();
  });
});
