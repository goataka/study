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
        id: "d4805287",
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

  it("guideUrl が ../math/ 相対パスの場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "../math/arithmetic/01-addition-no-carry/guide" })
    ).not.toThrow();
  });

  it("guideUrl が ../english/ 相対パスの場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "../english/pronunciation/01-alphabet/guide" })
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
    ).toThrow('"guideUrl" must be a relative path starting with "../" or an http/https URL');
  });

  it("guideUrl が data: スキームの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "data:text/html,<script>alert(1)</script>" })
    ).toThrow('"guideUrl" must be a relative path starting with "../" or an http/https URL');
  });

  it("guideUrl が想定外の相対パスの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "./guide.md" })
    ).toThrow('"guideUrl" must be a relative path starting with "../" or an http/https URL');
  });

  it("guideUrl にパストラバーサルが含まれる場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "../math/../../etc/passwd" })
    ).toThrow('"guideUrl" must not contain path traversal sequences');
  });

  it("guideUrl に URL エンコードされたパストラバーサルが含まれる場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "../math/%2e%2e/etc/passwd" })
    ).toThrow('"guideUrl" must not contain path traversal sequences');
  });

  it("example が文字列の場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, example: "I `play` games." })
    ).not.toThrow();
  });

  it("example が文字列でない場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, example: 123 })
    ).toThrow('"example" must be a string if present');
  });

  it("example が空文字の場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, example: "" })
    ).toThrow('"example" must not be an empty string');
  });

  it("example が空白のみの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, example: "   " })
    ).toThrow('"example" must not be an empty string');
  });

  it("example が undefined の場合は受け入れる（オプションフィールド）", () => {
    const { example: _example, ...withoutExample } = { ...validQF, example: undefined };
    expect(() => validateQuestionFile(withoutExample)).not.toThrow();
  });

  it("description が文字列の場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, description: "規則動詞は語尾に -ed をつけて過去形を作ります。" })
    ).not.toThrow();
  });

  it("description が文字列でない場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, description: 123 })
    ).toThrow('"description" must be a string if present');
  });

  it("description が空文字の場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, description: "" })
    ).toThrow('"description" must not be an empty string');
  });

  it("description が空白のみの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, description: "   " })
    ).toThrow('"description" must not be an empty string');
  });

  it("description が undefined の場合は受け入れる（オプションフィールド）", () => {
    const { description: _description, ...withoutDescription } = { ...validQF, description: undefined };
    expect(() => validateQuestionFile(withoutDescription)).not.toThrow();
  });
});

describe("expandQuestions — 問題展開仕様", () => {
  const qf: QuestionFile = {
    subject: "math",
    subjectName: "数学",
    category: "addition",
    categoryName: "足し算",
    questions: [
      { id: "919595e8", question: "1+1=?", choices: ["1", "2", "3", "4"], correct: 1, explanation: "1+1=2" },
      { id: "7f8b153f", question: "2+2=?", choices: ["2", "3", "4", "5"], correct: 2, explanation: "2+2=4" },
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
    expect(questions[0]!.id).toBe("919595e8");
    expect(questions[1]!.id).toBe("7f8b153f");
  });

  it("description がある場合は各問題に付加される", () => {
    const qfWithDescription: QuestionFile = {
      ...qf,
      description: "たし算を正確にできるようにします。",
    };
    const questions = expandQuestions(qfWithDescription);
    for (const q of questions) {
      expect(q.description).toBe("たし算を正確にできるようにします。");
    }
  });

  it("description がない場合は各問題の description が undefined になる", () => {
    const questions = expandQuestions(qf);
    for (const q of questions) {
      expect(q.description).toBeUndefined();
    }
  });
});

describe("shuffleChoices — 選択肢シャッフル仕様", () => {
  const question: Question = {
    id: "98fa3743",
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
    const question2 = { ...question, id: "568df4a1" };
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

describe("validateQuestionFile — text-input 問題種別の検証仕様", () => {
  const validTextInputQF = {
    subject: "japanese",
    subjectName: "国語",
    category: "kanji-grade1",
    categoryName: "漢字（小学1年）",
    questionType: "text-input",
    questions: [
      {
        id: "13619a84",
        question: "「山」の読み方をひらがなで書いてください",
        choices: ["やま"],
        correct: 0,
        explanation: "山（やま）",
      },
    ],
  };

  it("text-input 種別のファイルで choices が 1 つの問題を受け入れる", () => {
    expect(() => validateQuestionFile(validTextInputQF)).not.toThrow();
  });

  it("問題レベルの questionType が text-input でも受け入れる", () => {
    const qf = {
      subject: "japanese",
      subjectName: "国語",
      category: "kanji",
      categoryName: "漢字",
      questions: [
        {
          id: "062b1a83",
          question: "テスト問題",
          choices: ["こたえ"],
          correct: 0,
          explanation: "解説",
          questionType: "text-input",
        },
      ],
    };
    expect(() => validateQuestionFile(qf)).not.toThrow();
  });

  it("text-input 問題で choices が空の場合に拒否する", () => {
    const qf = { ...validTextInputQF, questions: [{ ...validTextInputQF.questions[0]!, choices: [] }] };
    expect(() => validateQuestionFile(qf)).toThrow("non-empty array");
  });

  it("text-input 問題で correct が choices の範囲外の場合に拒否する", () => {
    const qf = { ...validTextInputQF, questions: [{ ...validTextInputQF.questions[0]!, correct: 1 }] };
    expect(() => validateQuestionFile(qf)).toThrow("valid index");
  });

  it("無効な questionType 文字列を拒否する", () => {
    expect(() =>
      validateQuestionFile({ ...validTextInputQF, questionType: "invalid-type" })
    ).toThrow('"questionType" must be "multiple-choice" or "text-input"');
  });
});

describe("expandQuestions — questionType 継承仕様", () => {
  it("ファイルレベルの questionType が各問題に継承される", () => {
    const qf = {
      subject: "japanese",
      subjectName: "国語",
      category: "kanji-grade1",
      categoryName: "漢字（小学1年）",
      questionType: "text-input" as const,
      questions: [
        { id: "d1d1784d", question: "テスト", choices: ["こたえ"], correct: 0, explanation: "解説" },
      ],
    };
    const questions = expandQuestions(qf);
    expect(questions[0]!.questionType).toBe("text-input");
  });

  it("問題レベルの questionType がファイルレベルを上書きする", () => {
    const qf = {
      subject: "japanese",
      subjectName: "国語",
      category: "kanji",
      categoryName: "漢字",
      questionType: "text-input" as const,
      questions: [
        {
          id: "60f7dd4d",
          question: "4択テスト",
          choices: ["ア", "イ", "ウ", "エ"],
          correct: 0,
          explanation: "解説",
          questionType: "multiple-choice" as const,
        },
      ],
    };
    const questions = expandQuestions(qf);
    expect(questions[0]!.questionType).toBe("multiple-choice");
  });

  it("questionType が未指定の場合 multiple-choice がデフォルトになる", () => {
    const qf = {
      subject: "english",
      subjectName: "英語",
      category: "test",
      categoryName: "テスト",
      questions: [
        { id: "af521618", question: "テスト", choices: ["ア", "イ", "ウ", "エ"], correct: 0, explanation: "解説" },
      ],
    };
    const questions = expandQuestions(qf);
    expect(questions[0]!.questionType).toBe("multiple-choice");
  });
});

describe("shuffleChoices — text-input 問題のスキップ仕様", () => {
  it("text-input 問題はシャッフルせずにそのまま返す", () => {
    const q: Question = {
      id: "fd87c550",
      correct: 0,
      explanation: "解説",
      subject: "japanese",
      subjectName: "国語",
      category: "kanji-grade1",
      categoryName: "漢字（小学1年）",
      questionType: "text-input",
    };
    const result = shuffleChoices(q);
    expect(result).toBe(q); // 同一オブジェクトを返すこと
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
        id: "d4805287",
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
