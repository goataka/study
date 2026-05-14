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
    expect(() => validateManifest(null)).toThrow("マニフェストはオブジェクトでなければなりません");
  });

  it("version フィールドがない場合に拒否する", () => {
    expect(() => validateManifest({ subjects: {}, questionFiles: [] })).toThrow(
      'マニフェストには "version" 文字列フィールドが必要です',
    );
  });

  it("subjects フィールドがない場合に拒否する", () => {
    expect(() => validateManifest({ version: "1.0.0", questionFiles: [] })).toThrow(
      'マニフェストには "subjects" オブジェクトが必要です',
    );
  });

  it("questionFiles が配列でない場合に拒否する", () => {
    expect(() => validateManifest({ version: "1.0.0", subjects: {}, questionFiles: "not-an-array" })).toThrow(
      'マニフェストには "questionFiles" 配列が必要です',
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
    expect(() => validateQuestionFile(null)).toThrow("QuestionFile はオブジェクトでなければなりません");
  });

  it("subject フィールドがない場合に拒否する", () => {
    const { subject: _subject, ...rest } = validQF;
    expect(() => validateQuestionFile(rest)).toThrow('QuestionFile には "subject" 文字列フィールドが必要です');
  });

  it("questions が配列でない場合に拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, questions: "not-an-array" })).toThrow(
      'QuestionFile には "questions" 配列が必要です',
    );
  });

  it("選択肢が4つでない場合に拒否する", () => {
    const badQF = {
      ...validQF,
      questions: [{ ...validQF.questions[0]!, choices: ["ア", "イ", "ウ"] }],
    };
    expect(() => validateQuestionFile(badQF)).toThrow("ちょうど4要素");
  });

  it("correct が範囲外の場合に拒否する", () => {
    const badQF = {
      ...validQF,
      questions: [{ ...validQF.questions[0]!, correct: 5 }],
    };
    expect(() => validateQuestionFile(badQF)).toThrow("0 以上 3 以下の整数");
  });

  it("guideUrl が文字列でない場合に拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: 123 })).toThrow(
      '"guideUrl" が存在する場合は文字列でなければなりません',
    );
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
      '"guideUrl" は "./" または "../" で始まる相対パスか http/https URL でなければなりません',
    );
  });

  it("guideUrl が data: スキームの場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "data:text/html,<script>alert(1)</script>" })).toThrow(
      '"guideUrl" は "./" または "../" で始まる相対パスか http/https URL でなければなりません',
    );
  });

  it("guideUrl が ./ 相対パスの場合は受け入れる", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "./english/grammar/guide" })).not.toThrow();
  });

  it("guideUrl がプレフィックスなしの相対パスの場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "guide.md" })).toThrow(
      '"guideUrl" は "./" または "../" で始まる相対パスか http/https URL でなければなりません',
    );
  });

  it("guideUrl にパストラバーサルが含まれる場合は拒否する（../ プレフィックス）", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "../math/../../etc/passwd" })).toThrow(
      '"guideUrl" にはパストラバーサルシーケンスを含めることができません',
    );
  });

  it("guideUrl にパストラバーサルが含まれる場合は拒否する（./ プレフィックス）", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "./math/../../../etc/passwd" })).toThrow(
      '"guideUrl" にはパストラバーサルシーケンスを含めることができません',
    );
  });

  it("guideUrl に URL エンコードされたパストラバーサルが含まれる場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "../math/%2e%2e/etc/passwd" })).toThrow(
      '"guideUrl" にはパストラバーサルシーケンスを含めることができません',
    );
  });

  it("guideUrl が不正なパーセントエンコードを含む場合は拒否する（デコード例外）", () => {
    // "%E0%A4%A" は不完全なエンコードで decodeURIComponent が URIError をスローする。
    // この種の入力でデコード検査をバイパスしてパストラバーサルを成立させないように reject する。
    expect(() => validateQuestionFile({ ...validQF, guideUrl: "../math/%E0%A4%A" })).toThrow(
      '"guideUrl" は有効な URLエンコード文字列でなければなりません',
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
      '"parentCategoryGuideUrl" が存在する場合は文字列でなければなりません',
    );
  });

  it("parentCategoryGuideUrl が設定されているが parentCategory がない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, parentCategoryGuideUrl: "../math/arithmetic/guide" })).toThrow(
      '"parentCategoryGuideUrl" を設定するには "parentCategory" が必要です',
    );
  });

  it("parentCategoryGuideUrl が設定されているが parentCategoryName がない場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        parentCategory: "arithmetic",
        parentCategoryGuideUrl: "../math/arithmetic/guide",
      }),
    ).toThrow("parentCategory または parentCategoryName が存在する場合、両方が文字列でなければなりません");
  });

  it("parentCategoryGuideUrl が javascript: スキームの場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        parentCategory: "arithmetic",
        parentCategoryName: "算数",
        parentCategoryGuideUrl: "javascript:alert(1)",
      }),
    ).toThrow('"parentCategoryGuideUrl" は "./" または "../" で始まる相対パスか http/https URL でなければなりません');
  });

  it("parentCategoryGuideUrl にパストラバーサルが含まれる場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        parentCategory: "arithmetic",
        parentCategoryName: "算数",
        parentCategoryGuideUrl: "../math/../../etc/passwd",
      }),
    ).toThrow('"parentCategoryGuideUrl" にはパストラバーサルシーケンスを含めることができません');
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
      '"topCategoryGuideUrl" が存在する場合は文字列でなければなりません',
    );
  });

  it("topCategoryGuideUrl が設定されているが topCategory がない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, topCategoryGuideUrl: "../english/language/guide" })).toThrow(
      '"topCategoryGuideUrl" を設定するには "topCategory" が必要です',
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
    ).toThrow('"topCategoryGuideUrl" は "./" または "../" で始まる相対パスか http/https URL でなければなりません');
  });

  it("topCategoryGuideUrl にパストラバーサルが含まれる場合は拒否する", () => {
    expect(() =>
      validateQuestionFile({
        ...validQF,
        topCategory: "language",
        topCategoryName: "言語",
        topCategoryGuideUrl: "../english/../../etc/passwd",
      }),
    ).toThrow('"topCategoryGuideUrl" にはパストラバーサルシーケンスを含めることができません');
  });

  it("topCategoryGuideUrl が undefined の場合は受け入れる（オプションフィールド）", () => {
    expect(() => validateQuestionFile(validQF)).not.toThrow();
  });

  it("example が文字列の場合は受け入れる", () => {
    expect(() => validateQuestionFile({ ...validQF, example: "I `play` games." })).not.toThrow();
  });

  it("example が文字列でない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, example: 123 })).toThrow(
      '"example" が存在する場合は文字列でなければなりません',
    );
  });

  it("example が空文字の場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, example: "" })).toThrow('"example" は空文字列であってはなりません');
  });

  it("example が空白のみの場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, example: "   " })).toThrow(
      '"example" は空文字列であってはなりません',
    );
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
      '"description" が存在する場合は文字列でなければなりません',
    );
  });

  it("description が空文字の場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, description: "" })).toThrow(
      '"description" は空文字列であってはなりません',
    );
  });

  it("description が空白のみの場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQF, description: "   " })).toThrow(
      '"description" は空文字列であってはなりません',
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
      '"caseSensitive" が存在する場合はブール値でなければなりません',
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
    expect(() => validateQuestionFile(qf)).toThrow("空でない配列");
  });

  it("text-input 問題で correct が choices の範囲外の場合に拒否する", () => {
    const qf = { ...validTextInputQF, questions: [{ ...validTextInputQF.questions[0]!, correct: 1 }] };
    expect(() => validateQuestionFile(qf)).toThrow("有効なインデックス");
  });

  it("無効な questionType 文字列を拒否する", () => {
    expect(() => validateQuestionFile({ ...validTextInputQF, questionType: "invalid-type" })).toThrow(
      '"questionType" は "multiple-choice" または "text-input" でなければなりません',
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
    expect(() => validateQuestionFile(qf)).toThrow(
      "Question[0].caseSensitive が存在する場合はブール値でなければなりません",
    );
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
    expect(() => validateQuestionFile({ ...validQFBase, parentCategory: "grammar" })).toThrow(
      "両方が文字列でなければなりません",
    );
  });

  it("parentCategoryName だけ存在し parentCategory がない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQFBase, parentCategoryName: "文法" })).toThrow(
      "両方が文字列でなければなりません",
    );
  });

  it("どちらも省略した場合は受け入れる", () => {
    expect(() => validateQuestionFile(validQFBase)).not.toThrow();
  });
});

describe("validateQuestionFile — topCategory/topCategoryName 検証仕様", () => {
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

  it("topCategory と topCategoryName が両方文字列なら受け入れる", () => {
    expect(() =>
      validateQuestionFile({
        ...validQFBase,
        topCategory: "language",
        topCategoryName: "言語",
      }),
    ).not.toThrow();
  });

  it("topCategory だけ存在し topCategoryName がない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQFBase, topCategory: "language" })).toThrow(
      "両方が文字列でなければなりません",
    );
  });

  it("topCategoryName だけ存在し topCategory がない場合は拒否する", () => {
    expect(() => validateQuestionFile({ ...validQFBase, topCategoryName: "言語" })).toThrow(
      "両方が文字列でなければなりません",
    );
  });

  it("どちらも省略した場合は受け入れる", () => {
    expect(() => validateQuestionFile(validQFBase)).not.toThrow();
  });
});
