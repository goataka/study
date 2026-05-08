import { describe, it, expect, vi } from "vitest";
import {
  handleTopHeaderClick,
  handleParentHeaderClick,
  handleGradeHeaderClick,
  deselectAndRefresh,
  selectUnitContext,
  closeOverallUnitView,
  navigateBackToList,
  type SelectionStateAccess,
  type SelectionLifecycleEffects,
} from "./selectionHandlers";
import type { QuizFilter, QuizRecord } from "../../application/quizUseCase";

interface MutableState {
  filter: QuizFilter;
  selectedTopCategoryId: string | null;
  selectedGradeGroup: string | null;
  selectedUnitContext: { subject: string; categoryId: string; categoryName: string } | null;
  isPanelTabUserSelected: boolean;
}

function createState(initial: Partial<MutableState> = {}): {
  s: MutableState;
  access: SelectionStateAccess;
} {
  const s: MutableState = {
    filter: { subject: "english", category: "all", parentCategory: undefined },
    selectedTopCategoryId: null,
    selectedGradeGroup: null,
    selectedUnitContext: null,
    isPanelTabUserSelected: false,
    ...initial,
  };
  const access: SelectionStateAccess = {
    filter: s.filter,
    getSelectedTopCategoryId: () => s.selectedTopCategoryId,
    setSelectedTopCategoryId: (v) => {
      s.selectedTopCategoryId = v;
    },
    getSelectedGradeGroup: () => s.selectedGradeGroup,
    setSelectedGradeGroup: (v) => {
      s.selectedGradeGroup = v;
    },
    setSelectedUnitContext: (v) => {
      s.selectedUnitContext = v;
    },
    setIsPanelTabUserSelected: (v) => {
      s.isPanelTabUserSelected = v;
    },
  };
  return { s, access };
}

function createEffects(records: QuizRecord[] = []): {
  effects: SelectionLifecycleEffects;
  spies: Record<string, ReturnType<typeof vi.fn>>;
} {
  const spies = {
    updateCategoryListActive: vi.fn(),
    getHistory: vi.fn(() => records),
    autoSelectPanelTab: vi.fn(),
    updateStartScreen: vi.fn(),
    syncURLFragment: vi.fn(),
  };
  return { effects: spies as unknown as SelectionLifecycleEffects, spies };
}

describe("selectionHandlers", () => {
  describe("handleTopHeaderClick", () => {
    it("未選択 → 選択時に他の選択を全てクリアする", () => {
      const { s, access } = createState({ selectedGradeGroup: "g1", isPanelTabUserSelected: true });
      s.filter.parentCategory = "p1";
      s.filter.category = "c1";
      const { effects, spies } = createEffects();
      handleTopHeaderClick(access, effects, "top1");
      expect(s.selectedTopCategoryId).toBe("top1");
      expect(s.filter.category).toBe("all");
      expect(s.filter.parentCategory).toBeUndefined();
      expect(s.selectedGradeGroup).toBeNull();
      expect(s.isPanelTabUserSelected).toBe(false);
      expect(spies.updateCategoryListActive).toHaveBeenCalled();
    });
    it("既に同じトップカテゴリが選択されていれば非選択にする", () => {
      const { s, access } = createState({ selectedTopCategoryId: "top1" });
      const { effects } = createEffects();
      handleTopHeaderClick(access, effects, "top1");
      expect(s.selectedTopCategoryId).toBeNull();
    });
  });

  describe("handleParentHeaderClick", () => {
    it("既に同じ親カテゴリが選択されていれば非選択にする", () => {
      const { s, access } = createState();
      s.filter.parentCategory = "p1";
      const { effects } = createEffects();
      handleParentHeaderClick(access, effects, () => "parentCategory", "p1");
      expect(s.filter.parentCategory).toBeUndefined();
    });
    it("別の親カテゴリへの切り替え時は他の選択をクリアする", () => {
      const { s, access } = createState({ selectedTopCategoryId: "t1" });
      const { effects } = createEffects();
      handleParentHeaderClick(access, effects, () => "topCategory", "p1");
      expect(s.filter.parentCategory).toBe("p1");
      expect(s.selectedTopCategoryId).toBeNull();
    });
  });

  describe("handleGradeHeaderClick", () => {
    it("同じ学年で再クリック時は非選択にする", () => {
      const { s, access } = createState({ selectedGradeGroup: "g1" });
      const { effects } = createEffects();
      handleGradeHeaderClick(access, effects, "g1");
      expect(s.selectedGradeGroup).toBeNull();
    });
  });

  describe("deselectAndRefresh", () => {
    it("すべての選択を解除して URL 同期を呼ぶ", () => {
      const { s, access } = createState({ selectedTopCategoryId: "t1", selectedGradeGroup: "g1" });
      s.filter.category = "c1";
      const { effects, spies } = createEffects();
      deselectAndRefresh(access, effects);
      expect(s.filter.category).toBe("all");
      expect(s.selectedTopCategoryId).toBeNull();
      expect(s.selectedGradeGroup).toBeNull();
      expect(spies.syncURLFragment).toHaveBeenCalled();
    });
  });

  describe("selectUnitContext", () => {
    it("単元情報を設定し URL を同期する", () => {
      const { s, access } = createState({ isPanelTabUserSelected: true });
      const { effects, spies } = createEffects();
      selectUnitContext(access, effects, { subject: "math", categoryId: "add", categoryName: "たし算" });
      expect(s.selectedUnitContext).toEqual({ subject: "math", categoryId: "add", categoryName: "たし算" });
      expect(s.isPanelTabUserSelected).toBe(false);
      expect(spies.syncURLFragment).toHaveBeenCalled();
    });
  });

  describe("closeOverallUnitView", () => {
    it("単元選択を解除する", () => {
      const { s, access } = createState({
        selectedUnitContext: { subject: "english", categoryId: "c1", categoryName: "n" },
      });
      const { effects, spies } = createEffects();
      closeOverallUnitView(access, effects);
      expect(s.selectedUnitContext).toBeNull();
      expect(spies.syncURLFragment).toHaveBeenCalled();
    });
  });

  describe("navigateBackToList", () => {
    it("総合タブでは単元選択のみ解除する", () => {
      const { s, access } = createState({
        selectedUnitContext: { subject: "english", categoryId: "c1", categoryName: "n" },
      });
      s.filter.subject = "all";
      s.filter.category = "c1";
      const { effects } = createEffects();
      navigateBackToList(access, effects);
      expect(s.selectedUnitContext).toBeNull();
      expect(s.filter.category).toBe("c1"); // 通常タブ用ではないので filter は触らない
    });
    it("通常タブでは単元・カテゴリ選択を解除する", () => {
      const { s, access } = createState({ selectedTopCategoryId: "t1" });
      s.filter.subject = "english";
      s.filter.category = "c1";
      s.filter.parentCategory = "p1";
      const { effects } = createEffects();
      navigateBackToList(access, effects);
      expect(s.filter.category).toBe("all");
      expect(s.filter.parentCategory).toBeUndefined();
      expect(s.selectedTopCategoryId).toBeNull();
    });
  });
});
