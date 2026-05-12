/**
 * Question ドメイン — バリデーション仕様
 */

import { validateManifest, validateQuestionFile } from ".";
import type { QuestionFile } from ".";

describe("validateManifest — マニフェスト検証仕様", () => {
  it("有効なマニフェストを受け入れる", () => {
    expect(() =>
      validateManifest({
        version: "2.0.0",
        subjects: { english: { name: "英語" } },
        questionFiles: ["english/phonics-1.json"],
      }),
    ).not.toThrow();
  });

  it("null を拒否する", () => {
    expect(() => validateManifest(null)).toThrow("Manifest must be an object");
  });

  it("version フィールドがない場合に拒否する", () => {
    expect(() => validateManifest({ subjects: {}, questionFiles: [] })).toThrow(
      'Manifest must have a "version" string field',
    );
  });

  it("subjects フィールドがない場合に拒否する", () => {
    expect(() => validateManifest({ version: "1.0.0", questionFiles: [] })).toThrow(
      'Manifest must have a "subjects" object',
    );
  });

  it("questionFiles が配列でない場合に拒否する", () => {
    expect(() => validateManifest({ version: "1.0.0", subjects: {}, questionFiles: "not-an-array" })).toThrow(
      'Manifest must have a "questionFiles" array',
    );
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
        id: "8de9072f-20ec-57d3-bece-a063727bd360",
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
    expect(() => validateQuestionFile({ ...validQF, questions: "not-an-array" })).toThrow(
      'QuestionFile must have a "questions" array',
    );
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
    expect(() => validateQuestionFile({ ...validQF, guideUrl: 123 })).toThrow('"guideUrl" must be a string if present');
  });

  it("guideUrl が ../math/ 相対パスの場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "../math/arithmetic/01-addition-no-carry/guide" }),
    ).not.toThrow();
  });

  it("guideUrl が ../english/ 相対パスの場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, guideUrl: "../english/pronunciation/01-alphabet/guide" }),
    ).not.toThrow();
  });

  it("guideUrl が https URL の場合は受け入れる", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "https://example.com/guide" })).not.toThrow();
  });

  it("guideUrl が javascript: スキームの場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "javascript:alert(1)" })).toThrow(
      '"guideUrl" must be a relative path starting with "./" or "../" or an http/https URL',
    );
  });

  it("guideUrl が data: スキームの場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "data:text/html,<script>alert(1)</script>" })).toThrow(
      '"guideUrl" must be a relative path starting with "./" or "../" or an http/https URL',
    );
  });

  it("guideUrl が ./ 相対パスの場合は受け入れる", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "./english/grammar/guide" })).not.toThrow();
  });

  it("guideUrl がプレフィックスなしの相対パスの場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "guide.md" })).toThrow(
      '"guideUrl" must be a relative path starting with "./" or "../" or an http/https URL',
    );
  });

  it("guideUrl にパストラバーサルが含まれる場合は拒否する（../ プレフィックス）", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "../math/../../etc/passwd" })).toThrow(
      '"guideUrl" must not contain path traversal sequences',
    );
  });

  it("guideUrl にパストラバーサルが含まれる場合は拒否する（./ プレフィックス）", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "./math/../../../etc/passwd" })).toThrow(
      '"guideUrl" must not contain path traversal sequences',
    );
  });

  it("guideUrl に URL エンコードされたパストラバーサルが含まれる場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "../math/%2e%2e/etc/passwd" })).toThrow(
      '"guideUrl" must not contain path traversal sequences',
    );
  });

  it("guideUrl が不正なパーセントエンコードを含む場合は拒否する（デコード例外）", () => {
    // "%E0%A4%A" は不完全なエンコードで decodeURIComponent が URIError をスローする。
    // この種の入力でデコード検査をバイパスしてパストラバーサルを成立させないように reject する。
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "../math/%E0%A4%A" })).toThrow(
      '"guideUrl" must be a valid URL-encoded string',
    );
  });

  it("parentCategoryGuideUrl が文字列の相対パスの場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        parentCategory: "arithmetic",
        parentCategoryName: "算数",
        parentCategoryGuideUrl: "../math/arithmetic/guide",
      }),
    ).not.toThrow();
  });

  it("parentCategoryGuideUrl が https URL の場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        parentCategory: "arithmetic",
        parentCategoryName: "算数",
        parentCategoryGuideUrl: "https://example.com/guide",
      }),
    ).not.toThrow();
  });

  it("parentCategoryGuideUrl が文字列でない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, parentCategoryGuideUrl: 123 })).toThrow(
      '"parentCategoryGuideUrl" must be a string if present',
    );
  });

  it("parentCategoryGuideUrl が設定されているが parentCategory がない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, parentCategoryGuideUrl: "../math/arithmetic/guide" })).toThrow(
      '"parentCategoryGuideUrl" requires "parentCategory" to be set',
    );
  });

  it("parentCategoryGuideUrl が設定されているが parentCategoryName がない場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        parentCategory: "arithmetic",
        parentCategoryGuideUrl: "../math/arithmetic/guide",
      }),
    ).toThrow("If parentCategory or parentCategoryName is present, both must be strings");
  });

  it("parentCategoryGuideUrl が javascript: スキームの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        parentCategory: "arithmetic",
        parentCategoryName: "算数",
        parentCategoryGuideUrl: "javascript:alert(1)",
      }),
    ).toThrow('"parentCategoryGuideUrl" must be a relative path starting with "./" or "../" or an http/https URL');
  });

  it("parentCategoryGuideUrl にパストラバーサルが含まれる場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        parentCategory: "arithmetic",
        parentCategoryName: "算数",
        parentCategoryGuideUrl: "../math/../../etc/passwd",
      }),
    ).toThrow('"parentCategoryGuideUrl" must not contain path traversal sequences');
  });

  it("parentCategoryGuideUrl が undefined の場合は受け入れる（オプションフィールド）", () => {
    expect(() => validateQuestionFile(validQF)).not.toThrow();
  });

  it("topCategoryGuideUrl が文字列の相対パスの場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        topCategory: "language",
        topCategoryName: "言語",
        topCategoryGuideUrl: "../english/language/guide",
      }),
    ).not.toThrow();
  });

  it("topCategoryGuideUrl が https URL の場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        topCategory: "language",
        topCategoryName: "言語",
        topCategoryGuideUrl: "https://example.com/guide",
      }),
    ).not.toThrow();
  });

  it("topCategoryGuideUrl が文字列でない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, topCategoryGuideUrl: 123 })).toThrow(
      '"topCategoryGuideUrl" must be a string if present',
    );
  });

  it("topCategoryGuideUrl が設定されているが topCategory がない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, topCategoryGuideUrl: "../english/language/guide" })).toThrow(
      '"topCategoryGuideUrl" requires "topCategory" to be set',
    );
  });

  it("topCategoryGuideUrl が javascript: スキームの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        topCategory: "language",
        topCategoryName: "言語",
        topCategoryGuideUrl: "javascript:alert(1)",
      }),
    ).toThrow('"topCategoryGuideUrl" must be a relative path starting with "./" or "../" or an http/https URL');
  });

  it("topCategoryGuideUrl にパストラバーサルが含まれる場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        topCategory: "language",
        topCategoryName: "言語",
        topCategoryGuideUrl: "../english/../../etc/passwd",
      }),
    ).toThrow('"topCategoryGuideUrl" must not contain path traversal sequences');
  });

  it("topCategoryGuideUrl が undefined の場合は受け入れる（オプションフィールド）", () => {
    expect(() => validateQuestionFile(validQF)).not.toThrow();
  });

  it("example が文字列の場合は受け入れる", () => {
    expect(() => validateQuestionFile({ ...validQF, example: "I `play` games." })).not.toThrow();
  });

  it("example が文字列でない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, example: 123 })).toThrow('"example" must be a string if present');
  });

  it("example が空文字の場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, example: "" })).toThrow('"example" must not be an empty string');
  });

  it("example が空白のみの場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, example: "   " })).toThrow('"example" must not be an empty string');
  });

  it("example が undefined の場合は受け入れる（オプションフィールド）", () => {
    const { example: _example, ...withoutExample } = { ...validQF, example: undefined };
    expect(() => validateQuestionFile(withoutExample)).not.toThrow();
  });

  it("description が文字列の場合は受け入れる", () => {
    expect(() =>
      validateQuestionFile({ ...validQF, description: "規則動詞は語尾に -ed をつけて過去形を作ります。" }),
    ).not.toThrow();
  });

  it("description が文字列でない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, description: 123 })).toThrow(
      '"description" must be a string if present',
    );
  });

  it("description が空文字の場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, description: "" })).toThrow(
      '"description" must not be an empty string',
    );
  });

  it("description が空白のみの場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, description: "   " })).toThrow(
      '"description" must not be an empty string',
    );
  });

  it("description が undefined の場合は受け入れる（オプションフィールド）", () => {
    const { description: _description, ...withoutDescription } = { ...validQF, description: undefined };
    expect(() => validateQuestionFile(withoutDescription)).not.toThrow();
  });

  it("caseSensitive が true の場合は受け入れる", () => {
    expect(() => validateQuestionFile({ ...validQF, caseSensitive: true })).not.toThrow();
  });

  it("caseSensitive が false の場合は受け入れる", () => {
    expect(() => validateQuestionFile({ ...validQF, caseSensitive: false })).not.toThrow();
  });

  it("caseSensitive がブール値でない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, caseSensitive: "true" })).toThrow(
      '"caseSensitive" must be a boolean if present',
    );
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
        id: "5a373e06-a35a-509b-bb36-13dd462a26b4",
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
          id: "a68fec34-4878-5483-860b-df725cba6835",
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
    expect(() => validateQuestionFile({ ...validTextInputQF, questionType: "invalid-type" })).toThrow(
      '"questionType" must be "multiple-choice" or "text-input"',
    );
  });

  it("問題レベルの caseSensitive が true/false の場合は受け入れる", () => {
    const qfTrue = {
      ...validTextInputQF,
      questions: [{ ...validTextInputQF.questions[0]!, caseSensitive: true }],
    };
    const qfFalse = {
      ...validTextInputQF,
      questions: [{ ...validTextInputQF.questions[0]!, caseSensitive: false }],
    };
    expect(() => validateQuestionFile(qfTrue)).not.toThrow();
    expect(() => validateQuestionFile(qfFalse)).not.toThrow();
  });

  it("問題レベルの caseSensitive がブール値でない場合は拒否する", () => {
    const qf = {
      ...validTextInputQF,
      questions: [{ ...validTextInputQF.questions[0]!, caseSensitive: "true" }],
    };
    expect(() => validateQuestionFile(qf)).toThrow("Question[0].caseSensitive must be a boolean if present");
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
        id: "8de9072f-20ec-57d3-bece-a063727bd360",
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
      }),
    ).not.toThrow();
  });

  it("parentCategory だけ存在し parentCategoryName がない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQFBase, parentCategory: "grammar" })).toThrow("both must be strings");
  });

  it("parentCategoryName だけ存在し parentCategory がない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQFBase, parentCategoryName: "文法" })).toThrow("both must be strings");
  });

  it("どちらも省略した場合は受け入れる", () => {
    expect(() => validateQuestionFile(validQFBase)).not.toThrow();
  });
});
