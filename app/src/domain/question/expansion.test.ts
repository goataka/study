/**
 * Question ドメイン — 問題展開仕様
 */

import { expandQuestions } from "../question";
import type { QuestionFile, Question } from "../question";

describe("expandQuestions — 問題展開仕様", () => {
  const qf: QuestionFile = {
    subject: "math",
    subjectName: "数学",
    category: "addition",
    categoryName: "足し算",
    questions: [
      {
        id: "d013bc91-9c9a-5d3e-9c3e-54df258a661c",
        question: "1+1=?",
        choices: ["1", "2", "3", "4"],
        correct: 1,
        explanation: "1+1=2",
      },
      {
        id: "a713882e-64f5-50e6-acd6-e9f68925ae3a",
        question: "2+2=?",
        choices: ["2", "3", "4", "5"],
        correct: 2,
        explanation: "2+2=4",
      },
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
    expect(questions[0]!.id).toBe("d013bc91-9c9a-5d3e-9c3e-54df258a661c");
    expect(questions[1]!.id).toBe("a713882e-64f5-50e6-acd6-e9f68925ae3a");
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

  it("parentCategoryGuideUrl がある場合は各問題に付加される", () => {
    const qfWithParentGuide: QuestionFile = {
      ...qf,
      parentCategory: "arithmetic",
      parentCategoryName: "算数",
      parentCategoryGuideUrl: "../math/arithmetic/guide",
    };
    const questions = expandQuestions(qfWithParentGuide);
    for (const q of questions) {
      expect(q.parentCategoryGuideUrl).toBe("../math/arithmetic/guide");
    }
  });

  it("parentCategoryGuideUrl がない場合は各問題の parentCategoryGuideUrl が undefined になる", () => {
    const questions = expandQuestions(qf);
    for (const q of questions) {
      expect(q.parentCategoryGuideUrl).toBeUndefined();
    }
  });

  it("topCategoryGuideUrl がある場合は各問題に付加される", () => {
    const qfWithTopGuide: QuestionFile = {
      ...qf,
      topCategory: "language",
      topCategoryName: "言語",
      topCategoryGuideUrl: "../english/language/guide",
    };
    const questions = expandQuestions(qfWithTopGuide);
    for (const q of questions) {
      expect(q.topCategoryGuideUrl).toBe("../english/language/guide");
    }
  });

  it("topCategoryGuideUrl がない場合は各問題の topCategoryGuideUrl が undefined になる", () => {
    const questions = expandQuestions(qf);
    for (const q of questions) {
      expect(q.topCategoryGuideUrl).toBeUndefined();
    }
  });

  it("caseSensitive がある場合は各問題に付加される", () => {
    const qfCaseSensitive: QuestionFile = {
      ...qf,
      caseSensitive: true,
    };
    const questions = expandQuestions(qfCaseSensitive);
    for (const q of questions) {
      expect(q.caseSensitive).toBe(true);
    }
  });

  it("caseSensitive がない場合は各問題の caseSensitive が undefined になる", () => {
    const questions = expandQuestions(qf);
    for (const q of questions) {
      expect(q.caseSensitive).toBeUndefined();
    }
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
        {
          id: "7e09165c-058d-505b-a43b-802be91b90b5",
          question: "テスト",
          choices: ["こたえ"],
          correct: 0,
          explanation: "解説",
        },
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
          id: "50cf3979-ff8e-5d0d-9d28-c6150dc161b9",
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
        {
          id: "2bddd8e7-8a2e-5a3c-b9c4-9b5f35f254e1",
          question: "テスト",
          choices: ["ア", "イ", "ウ", "エ"],
          correct: 0,
          explanation: "解説",
        },
      ],
    };
    const questions = expandQuestions(qf);
    expect(questions[0]!.questionType).toBe("multiple-choice");
  });
});
