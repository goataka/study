import { describe, it, expect, vi } from "vitest";
import {
  resolveEffectiveMode,
  tryStartQuizSession,
  confirmAndStartWithAllQuestions,
  submitQuizSession,
  isCurrentCategoryLearned,
  toggleLearnedStatus,
} from "./quizLifecycle";
import { ERROR_ALL_MASTERED, type QuizFilter } from "../../application/quizUseCase";

function makeFilter(): QuizFilter {
  return { subject: "english", category: "alphabet", parentCategory: undefined };
}

describe("quizLifecycle", () => {
  describe("resolveEffectiveMode", () => {
    it("random + straight → practice", () => {
      expect(resolveEffectiveMode("random", "straight")).toBe("practice");
    });
    it("random + random → random", () => {
      expect(resolveEffectiveMode("random", "random")).toBe("random");
    });
    it("practice モードはそのまま", () => {
      expect(resolveEffectiveMode("practice", "random")).toBe("practice");
    });
  });

  describe("tryStartQuizSession", () => {
    it("成功時に session を返す", () => {
      const fakeSession = { id: "s1" } as never;
      const useCase = {
        startSession: vi.fn(() => fakeSession),
        startSessionWithAllQuestions: vi.fn(),
      };
      const out = tryStartQuizSession("random", {
        useCase: useCase as never,
        effectiveFilter: makeFilter(),
        questionCount: 10,
        includeMastered: false,
        quizOrder: "random",
        showConfirmDialog: vi.fn(),
        notifyError: vi.fn(),
      });
      expect(out).toEqual({ kind: "success", session: fakeSession });
      expect(useCase.startSession).toHaveBeenCalled();
    });
    it("ERROR_ALL_MASTERED → all-mastered", () => {
      const useCase = {
        startSession: vi.fn(() => {
          throw new Error(ERROR_ALL_MASTERED);
        }),
        startSessionWithAllQuestions: vi.fn(),
      };
      const out = tryStartQuizSession("random", {
        useCase: useCase as never,
        effectiveFilter: makeFilter(),
        questionCount: 10,
        includeMastered: false,
        quizOrder: "random",
        showConfirmDialog: vi.fn(),
        notifyError: vi.fn(),
      });
      expect(out.kind).toBe("all-mastered");
    });
    it("その他のエラーは error を返す", () => {
      const useCase = {
        startSession: vi.fn(() => {
          throw new Error("oops");
        }),
        startSessionWithAllQuestions: vi.fn(),
      };
      const out = tryStartQuizSession("random", {
        useCase: useCase as never,
        effectiveFilter: makeFilter(),
        questionCount: 10,
        includeMastered: false,
        quizOrder: "random",
        showConfirmDialog: vi.fn(),
        notifyError: vi.fn(),
      });
      expect(out).toEqual({ kind: "error", message: "oops" });
    });
    it("includeMastered=true なら startSessionWithAllQuestions を呼ぶ", () => {
      const fakeSession = { id: "s1" } as never;
      const useCase = {
        startSession: vi.fn(),
        startSessionWithAllQuestions: vi.fn(() => fakeSession),
      };
      tryStartQuizSession("random", {
        useCase: useCase as never,
        effectiveFilter: makeFilter(),
        questionCount: 5,
        includeMastered: true,
        quizOrder: "random",
        showConfirmDialog: vi.fn(),
        notifyError: vi.fn(),
      });
      expect(useCase.startSessionWithAllQuestions).toHaveBeenCalled();
      expect(useCase.startSession).not.toHaveBeenCalled();
    });
  });

  describe("confirmAndStartWithAllQuestions", () => {
    it("ユーザーがキャンセルすれば null", async () => {
      const useCase = {
        startSessionWithAllQuestions: vi.fn(),
      };
      const result = await confirmAndStartWithAllQuestions({
        useCase: useCase as never,
        effectiveFilter: makeFilter(),
        questionCount: 10,
        includeMastered: false,
        quizOrder: "random",
        showConfirmDialog: vi.fn().mockResolvedValue(false),
        notifyError: vi.fn(),
      });
      expect(result).toBeNull();
    });
    it("承諾されれば session を返す", async () => {
      const fakeSession = { id: "x" } as never;
      const useCase = {
        startSessionWithAllQuestions: vi.fn(() => fakeSession),
      };
      const result = await confirmAndStartWithAllQuestions({
        useCase: useCase as never,
        effectiveFilter: makeFilter(),
        questionCount: 10,
        includeMastered: false,
        quizOrder: "random",
        showConfirmDialog: vi.fn().mockResolvedValue(true),
        notifyError: vi.fn(),
      });
      expect(result).toBe(fakeSession);
    });
  });

  describe("submitQuizSession", () => {
    it("採点して履歴記録し onAfterSubmit を呼ぶ", () => {
      const fakeResults = [{ id: "r1" }];
      const useCase = {
        submitSession: vi.fn(() => fakeResults),
        addHistoryRecord: vi.fn(),
      };
      const onAfterSubmit = vi.fn();
      const out = submitQuizSession({
        useCase: useCase as never,
        session: { id: "s" } as never,
        effectiveFilter: makeFilter(),
        currentMode: "random",
        onAfterSubmit,
      });
      expect(out).toBe(fakeResults);
      expect(useCase.submitSession).toHaveBeenCalled();
      expect(useCase.addHistoryRecord).toHaveBeenCalled();
      expect(onAfterSubmit).toHaveBeenCalled();
    });
  });

  describe("isCurrentCategoryLearned", () => {
    it("category=all のとき false", () => {
      const useCase = { getMasteredCountForCategory: vi.fn() };
      const filter: QuizFilter = { subject: "english", category: "all", parentCategory: undefined };
      expect(isCurrentCategoryLearned(useCase as never, filter)).toBe(false);
    });
    it("全問題が学習済みなら true", () => {
      const useCase = {
        getMasteredCountForCategory: vi.fn(() => ({ mastered: 5, total: 5 })),
      };
      expect(isCurrentCategoryLearned(useCase as never, makeFilter())).toBe(true);
    });
    it("全問題でなければ false", () => {
      const useCase = {
        getMasteredCountForCategory: vi.fn(() => ({ mastered: 3, total: 5 })),
      };
      expect(isCurrentCategoryLearned(useCase as never, makeFilter())).toBe(false);
    });
  });

  describe("toggleLearnedStatus", () => {
    it("確認キャンセル時は何もしない", async () => {
      const useCase = {
        getMasteredCountForCategory: vi.fn(() => ({ mastered: 0, total: 5 })),
        markCategoryAsLearned: vi.fn(),
        unmarkCategoryAsLearned: vi.fn(),
      };
      const onAfterToggle = vi.fn();
      await toggleLearnedStatus({
        useCase: useCase as never,
        effectiveFilter: makeFilter(),
        showConfirmDialog: vi.fn().mockResolvedValue(false),
        onAfterToggle,
      });
      expect(useCase.markCategoryAsLearned).not.toHaveBeenCalled();
      expect(onAfterToggle).not.toHaveBeenCalled();
    });
    it("未学習 → 承諾で学習済みにマーク", async () => {
      const useCase = {
        getMasteredCountForCategory: vi.fn(() => ({ mastered: 0, total: 5 })),
        markCategoryAsLearned: vi.fn(),
        unmarkCategoryAsLearned: vi.fn(),
      };
      const onAfterToggle = vi.fn();
      await toggleLearnedStatus({
        useCase: useCase as never,
        effectiveFilter: makeFilter(),
        showConfirmDialog: vi.fn().mockResolvedValue(true),
        onAfterToggle,
      });
      expect(useCase.markCategoryAsLearned).toHaveBeenCalled();
      expect(onAfterToggle).toHaveBeenCalled();
    });
    it("学習済み → 承諾で未学習に戻す", async () => {
      const useCase = {
        getMasteredCountForCategory: vi.fn(() => ({ mastered: 5, total: 5 })),
        markCategoryAsLearned: vi.fn(),
        unmarkCategoryAsLearned: vi.fn(),
      };
      const onAfterToggle = vi.fn();
      await toggleLearnedStatus({
        useCase: useCase as never,
        effectiveFilter: makeFilter(),
        showConfirmDialog: vi.fn().mockResolvedValue(true),
        onAfterToggle,
      });
      expect(useCase.unmarkCategoryAsLearned).toHaveBeenCalled();
    });
  });
});
