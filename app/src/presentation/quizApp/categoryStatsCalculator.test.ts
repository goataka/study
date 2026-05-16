import { describe, expect, it } from "vitest";
import {
  categoryStatsKey,
  computeCategoryStatsMap,
  deriveCategoryItemStatus,
  formatCategoryStatsText,
  type CategoryStat,
} from "./categoryStatsCalculator";
import type { QuizUseCase, Question } from "../../application/quizUseCase";

describe("categoryStatsCalculator 関数", () => {
  describe("formatCategoryStatsText 関数", () => {
    it("total が 0 の場合は空文字", () => {
      expect(formatCategoryStatsText({ total: 0, inProgress: 0, mastered: 0 })).toBe("");
    });
    it("inProgress > 0 の場合は mastered(inProgress)/total", () => {
      expect(formatCategoryStatsText({ total: 10, inProgress: 2, mastered: 3 })).toBe("3(2)/10");
    });
    it("inProgress == 0 の場合は mastered/total", () => {
      expect(formatCategoryStatsText({ total: 10, inProgress: 0, mastered: 7 })).toBe("7/10");
    });
  });

  describe("deriveCategoryItemStatus 関数", () => {
    const studied = new Set<string>(["x::studied"]);
    it("全問習得済みなら learned", () => {
      const v = deriveCategoryItemStatus({ total: 5, inProgress: 0, mastered: 5 }, studied, "x::a");
      expect(v).toEqual({ status: "learned", icon: "✔️" });
    });
    it("inProgress > 0 なら studying", () => {
      const v = deriveCategoryItemStatus({ total: 5, inProgress: 1, mastered: 0 }, studied, "x::a");
      expect(v.status).toBe("studying");
      expect(v.icon).toBe("🔄");
    });
    it("studiedKeys に含まれていれば studying", () => {
      const v = deriveCategoryItemStatus({ total: 5, inProgress: 0, mastered: 0 }, studied, "x::studied");
      expect(v.status).toBe("studying");
    });
    it("どちらでもなければ unlearned", () => {
      const v = deriveCategoryItemStatus({ total: 5, inProgress: 0, mastered: 0 }, studied, "x::other");
      expect(v).toEqual({ status: "unlearned", icon: "⬜" });
    });
    it("total が 0 なら learned 判定にはならない", () => {
      const v = deriveCategoryItemStatus({ total: 0, inProgress: 0, mastered: 0 }, studied, "x::empty");
      expect(v.status).toBe("unlearned");
    });
  });

  describe("categoryStatsKey 関数", () => {
    it("category != 'all' なら subject::category", () => {
      expect(categoryStatsKey("english", "abc")).toBe("english::abc");
    });
    it("category == 'all' なら subject::all", () => {
      expect(categoryStatsKey("english", "all")).toBe("english::all");
    });
  });

  describe("computeCategoryStatsMap 関数", () => {
    function makeQ(id: string, subject: string, category: string, parentCategory?: string): Question {
      return { id, subject, category, parentCategory, type: "input", text: "", answer: "" } as unknown as Question;
    }

    it("subject/category/parentCategory ごとに統計を集計する", () => {
      const questions = [
        makeQ("q1", "math", "add", "calc"),
        makeQ("q2", "math", "add", "calc"),
        makeQ("q3", "math", "sub", "calc"),
      ];
      const useCase = {
        getFilteredQuestions: () => questions,
        getMasteredIds: () => ["q1"],
        getAllQuestionStats: () => ({ q2: { total: 1, correct: 0 } }),
        getStudiedCategoryKeys: () => new Set<string>(),
      } as unknown as QuizUseCase;

      const map = computeCategoryStatsMap(useCase);
      // all::all - total 3, mastered 1, inProgress 1 (q2)
      expect(map.get("all::all")).toEqual<CategoryStat>({ total: 3, mastered: 1, inProgress: 1 });
      // math::all - total 3
      expect(map.get("math::all")).toEqual<CategoryStat>({ total: 3, mastered: 1, inProgress: 1 });
      // math::add - total 2, mastered 1, inProgress 1
      expect(map.get("math::add")).toEqual<CategoryStat>({ total: 2, mastered: 1, inProgress: 1 });
      // math::sub - total 1
      expect(map.get("math::sub")).toEqual<CategoryStat>({ total: 1, mastered: 0, inProgress: 0 });
      // math::parent::calc - total 3
      expect(map.get("math::parent::calc")).toEqual<CategoryStat>({ total: 3, mastered: 1, inProgress: 1 });
    });
  });
});
