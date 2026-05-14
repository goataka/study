/**
 * CategoryRegistry の単体テスト。
 *
 * カテゴリ階層クエリ（subject → topCategory → parentCategory → category）と
 * カテゴリメタデータ（guideUrl / example / referenceGrade / description）が
 * `Question[]` から正しく集約されることを検証する。
 */

import { describe, it, expect } from "vitest";
import type { Question } from "../question";
import { CategoryRegistry } from "./CategoryRegistry";

function makeQuestion(overrides: Partial<Question> & Pick<Question, "id" | "subject" | "category">): Question {
  return {
    id: overrides.id,
    question: "q",
    choices: ["a", "b", "c", "d"],
    correct: 0,
    explanation: "",
    subject: overrides.subject,
    subjectName: overrides.subject,
    category: overrides.category,
    categoryName: overrides.category,
    ...overrides,
  };
}

describe("CategoryRegistry クラス", () => {
  const questions: Question[] = [
    makeQuestion({
      id: "q1",
      subject: "english",
      category: "phonics-1",
      categoryName: "フォニックス1",
      parentCategory: "phonics",
      parentCategoryName: "フォニックス",
      topCategory: "pronunciation",
      topCategoryName: "発音",
      guideUrl: "./english/phonics-1/guide.md",
      parentCategoryGuideUrl: "./english/phonics/guide.md",
      topCategoryGuideUrl: "./english/pronunciation/guide.md",
      example: "cat",
      description: "短母音の練習",
      referenceGrade: "小学1年",
    }),
    makeQuestion({
      id: "q2",
      subject: "english",
      category: "phonics-2",
      categoryName: "フォニックス2",
      parentCategory: "phonics",
      parentCategoryName: "フォニックス",
      topCategory: "pronunciation",
      topCategoryName: "発音",
      referenceGrade: "小学2年",
    }),
    makeQuestion({
      id: "q3",
      subject: "math",
      category: "addition",
      categoryName: "たし算",
    }),
  ];

  describe("階層クエリ", () => {
    it("getCategoriesForSubject で教科のカテゴリ一覧を返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getCategoriesForSubject("english")).toEqual({
        "phonics-1": "フォニックス1",
        "phonics-2": "フォニックス2",
      });
      expect(reg.getCategoriesForSubject("math")).toEqual({ addition: "たし算" });
      expect(reg.getCategoriesForSubject("science")).toEqual({});
    });

    it("getParentCategoriesForSubject は親カテゴリ一覧を重複なしで返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getParentCategoriesForSubject("english")).toEqual({ phonics: "フォニックス" });
      expect(reg.getParentCategoriesForSubject("math")).toEqual({});
    });

    it("getCategoriesForParent は指定親カテゴリ配下のカテゴリのみ返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getCategoriesForParent("english", "phonics")).toEqual({
        "phonics-1": "フォニックス1",
        "phonics-2": "フォニックス2",
      });
      expect(reg.getCategoriesForParent("english", "unknown")).toEqual({});
    });

    it("getTopCategoriesForSubject はトップカテゴリ一覧を返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getTopCategoriesForSubject("english")).toEqual({ pronunciation: "発音" });
      expect(reg.getTopCategoriesForSubject("math")).toEqual({});
    });

    it("getParentCategoriesForTop は指定トップカテゴリ配下の親カテゴリのみ返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getParentCategoriesForTop("english", "pronunciation")).toEqual({ phonics: "フォニックス" });
    });
  });

  describe("メタデータ", () => {
    it("getCategoryGuideUrl は guideUrl を返す（未設定時 undefined）", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getCategoryGuideUrl("english", "phonics-1")).toBe("./english/phonics-1/guide.md");
      expect(reg.getCategoryGuideUrl("english", "phonics-2")).toBeUndefined();
    });

    it("getParentCategoryGuideUrl / getTopCategoryGuideUrl も同様に動作する", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getParentCategoryGuideUrl("english", "phonics")).toBe("./english/phonics/guide.md");
      expect(reg.getTopCategoryGuideUrl("english", "pronunciation")).toBe("./english/pronunciation/guide.md");
    });

    it("getParentCategoryForUnit / getTopCategoryForUnit は親・トップ参照を返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getParentCategoryForUnit("english", "phonics-1")).toEqual({ id: "phonics", name: "フォニックス" });
      expect(reg.getTopCategoryForUnit("english", "phonics-1")).toEqual({ id: "pronunciation", name: "発音" });
      expect(reg.getParentCategoryForUnit("math", "addition")).toBeUndefined();
    });

    it("getCategoryExample / getCategoryDescription / getCategoryReferenceGrade を返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getCategoryExample("english", "phonics-1")).toBe("cat");
      expect(reg.getCategoryDescription("english", "phonics-1")).toBe("短母音の練習");
      expect(reg.getCategoryReferenceGrade("english", "phonics-1")).toBe("小学1年");
      expect(reg.getCategoryReferenceGrade("english", "phonics-2")).toBe("小学2年");
    });

    it("getFirstAvailableGuideUrl は最初に登録された guideUrl を返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getFirstAvailableGuideUrl()).toBe("./english/phonics-1/guide.md");
    });

    it("getFirstAvailableGuideUrl は guideUrl が無いとき undefined を返す", () => {
      const reg = new CategoryRegistry([makeQuestion({ id: "q", subject: "math", category: "addition" })]);
      expect(reg.getFirstAvailableGuideUrl()).toBeUndefined();
    });
  });

  describe("学年ビュー", () => {
    it("getUniqueGradesForSubject は出現順に重複なしで学年を返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getUniqueGradesForSubject("english")).toEqual(["小学1年", "小学2年"]);
      expect(reg.getUniqueGradesForSubject("math")).toEqual([]);
    });

    it("getCategoriesForGrade は指定学年のカテゴリのみ返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getCategoriesForGrade("english", "小学1年")).toEqual({ "phonics-1": "フォニックス1" });
      expect(reg.getCategoriesForGrade("english", "小学2年")).toEqual({ "phonics-2": "フォニックス2" });
    });

    it("getCategoriesWithoutGrade は referenceGrade が未設定のカテゴリのみ返す", () => {
      const reg = new CategoryRegistry(questions);
      expect(reg.getCategoriesWithoutGrade("english")).toEqual({});
      expect(reg.getCategoriesWithoutGrade("math")).toEqual({ addition: "たし算" });
    });
  });
});
